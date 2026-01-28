import axios from "axios";
import { GraphQLError } from "graphql";
import { prisma } from "../lib/prisma";
import { requireUser } from "../auth";
import { neo4jDriver } from "../db/neo4j";

export const contentService = {
  async getContent({ id }: { id: string }, ctx: any) {
    const user = requireUser(ctx);
    const content = await prisma.content.findUnique({ where: { id } });
    if (!content) {
      throw new GraphQLError("Content not found");
    }
    return content;
  },

  async addContent(
    {
      dashboardId,
      title,
      type,
      notesText,
      notesJSON,
    }: {
      dashboardId: string;
      title: string;
      type: string;
      notesText: string;
      notesJSON: any;
    },
    ctx: any,
  ) {
    const user = requireUser(ctx);

    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
    });

    if (!dashboard || dashboard.userId !== user.id) {
      throw new GraphQLError("Dashboard not found or unauthorized");
    }

    const content = await prisma.content.create({
      data: { dashboardId, title, type, notesText, notesJSON },
    });

    await prisma.dashboard.update({
      where: { id: dashboardId },
      data: { updatedAt: new Date() },
    });

    const contentId = content.id;

    let tags: string[] = [];
    try {
      const llmRes = await axios.post("http://localhost:8000/suggest-tags", {
        title,
        notesText: notesText || "",
      });
      tags = llmRes.data.suggested_tags;
    } catch (e) {
      console.error("LLM tag service error:", e);
    }

    const session = neo4jDriver.session();
    try {
      for (const tagName of tags) {
        await session.run(
          `
            MERGE (t:Tag {name: $tagName})
            ON CREATE SET t.popularity = 1
            ON MATCH SET t.popularity = t.popularity + 1
            RETURN t
          `,
          { tagName },
        );

        await session.run(
          `
            MERGE (c:Content {dashboardId: $dashboardId, contentId: $contentId, title: $title})
            `,
          { dashboardId, contentId, title },
        );

        await session.run(
          `
            MATCH (t:Tag {name: $tagName}), (c:Content {dashboardId: $dashboardId, contentId: $contentId})
            MERGE (t)-[:DESCRIBES]->(c)
            `,
          { tagName, dashboardId, contentId },
        );
      }
    } finally {
      await session.close();
    }
    return content;
  },

  async updateContent(
    {
      id,
      title,
      type,
      notesText,
      notesJSON,
    }: {
      id: string;
      title: string;
      type: string;
      notesText: string;
      notesJSON: any;
    },
    ctx: any,
  ) {
    const content = await prisma.content.findUnique({ where: { id } });
    const user = requireUser(ctx);
    if (!content) {
      throw new GraphQLError("Content not found");
    }

    const updatedContent = await prisma.content.update({
      where: { id },
      data: { title, type, notesText, notesJSON },
    });

    await prisma.dashboard.update({
      where: { id: content.dashboardId },
      data: { updatedAt: new Date() },
    });

    return updatedContent;
  },

  async deleteContent({ id }: { id: string }, ctx: any) {
    const content = await prisma.content.findUnique({ where: { id } });
    if (!content) {
      return false;
    }

    const user = requireUser(ctx);

    const session = neo4jDriver.session();
    try {
      const neo4jResult = await session.run(
        `MATCH (c:Content {contentId: $contentId}) DETACH DELETE c RETURN count(c) as deleted`,
        { contentId: id },
      );
      const deletedCount =
        neo4jResult.records[0]?.get("deleted")?.toNumber() || 0;

      const deleteContent = await prisma.content.delete({ where: { id } });

      return deleteContent !== null && deletedCount > 0;
    } finally {
      await session.close();
    }
  },
};
