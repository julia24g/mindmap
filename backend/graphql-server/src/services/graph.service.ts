import { GraphQLError } from "graphql";
import { neo4jDriver } from "../db/neo4j";
import neo4j from "neo4j-driver";
import { prisma } from "../lib/prisma";
import { requireUser } from "../auth";

async function getGraphData(dashboardId: string) {
  const session = neo4jDriver.session();
  try {
    const tag_to_content = await session.run(
      `
          MATCH (tag:Tag)-[:DESCRIBES]->(content:Content {dashboardId: $dashboardId})
          RETURN DISTINCT tag AS t, content AS c
          `,
      { dashboardId },
    );

    const tag_to_tag = await session.run(
      `
          MATCH (parent:Tag)-[r:HAS_SUBTAG]->(sub:Tag)
          RETURN COLLECT(DISTINCT {start: id(parent), end: id(sub)}) AS subtagRels
          `,
    );

    const nodesMap = new Map<string, any>();
    const edges: any[] = [];

    tag_to_content.records.forEach((record) => {
      const tag = record.get("t");
      const content = record.get("c");

      const tagId = tag?.identity?.toNumber
        ? tag.identity.toNumber()
        : tag?.identity;
      const contentInternalId = content?.identity?.toNumber
        ? content.identity.toNumber()
        : content?.identity;
      const contentNodeIdProp =
        content?.properties?.contentId ?? contentInternalId;

      if (tag && !nodesMap.has(`tag_${tagId}`)) {
        nodesMap.set(`tag_${tagId}`, {
          id: `tag_${tagId}`,
          label: "tag",
          name: tag.properties.name,
        });
      }

      if (content && !nodesMap.has(`content_${contentInternalId}`)) {
        nodesMap.set(`content_${contentInternalId}`, {
          id: `content_${contentInternalId}`,
          label: "content",
          contentId: contentNodeIdProp,
          title: content.properties.title || "",
        });
      }

      if (tag && content) {
        edges.push({
          from: `tag_${tagId}`,
          to: `content_${contentInternalId}`,
          type: "DESCRIBES",
        });
      }
    });

    const subtagRels = tag_to_tag.records[0]?.get("subtagRels") || [];
    subtagRels.forEach((rel: any) => {
      const start =
        rel.start && rel.start.toNumber ? rel.start.toNumber() : rel.start;
      const end = rel.end && rel.end.toNumber ? rel.end.toNumber() : rel.end;
      edges.push({
        from: `tag_${start}`,
        to: `tag_${end}`,
        type: "HAS_SUBTAG",
      });
    });

    return { nodes: Array.from(nodesMap.values()), edges };
  } finally {
    await session.close();
  }
}

export const graphService = {
  async getGraph({ dashboardId }: { dashboardId: string }, ctx: any) {
    const user = requireUser(ctx);
    return await getGraphData(dashboardId);
  },

  async getPublicGraph({ dashboardId }: { dashboardId: string }) {
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
    });
    if (!dashboard || dashboard.visibility !== "PUBLIC") {
      throw new GraphQLError("Dashboard not found or not public");
    }
    return await getGraphData(dashboardId);
  },

  async allTags({ limit }: { limit?: number }) {
    const session = neo4jDriver.session();
    try {
      const query = limit
        ? "MATCH (t:Tag) RETURN t.name AS name ORDER BY t.popularity LIMIT $limit"
        : "MATCH (t:Tag) RETURN t.name AS name ORDER BY t.popularity";
      const result = await session.run(
        query,
        limit ? { limit: neo4j.int(limit) } : {},
      );
      return result.records.map((record) => record.get("name"));
    } finally {
      await session.close();
    }
  },
};
