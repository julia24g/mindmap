import axios from "axios";
import { GraphQLDateTime, GraphQLJSON } from "graphql-scalars";
import { neo4jDriver } from "./db/neo4j";
import neo4j from "neo4j-driver";
import { GraphQLError } from "graphql";
import jwt from "jsonwebtoken";
import { getAuth } from "firebase-admin/auth";
import { prisma } from "./lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

function getAdminAuth() {
  return getAuth();
}

async function getUserIdByFirebaseUid(firebaseUid: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { firebaseUid },
    select: { id: true },
  });
  if (!user) {
    throw new GraphQLError("User not found");
  }
  return user.id;
}

export const resolvers = {
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,
  Query: {
    // User management queries
    async getUser(_: any, { id }: { id: string }) {
      const user = await prisma.user.findUnique({
        where: { id },
      });
      if (!user) {
        throw new GraphQLError("User not found");
      }
      return user;
    },
    // Get all content information
    async getContent(
      _: any,
      { id, firebaseUid }: { id: string; firebaseUid: string },
    ) {
      const userId = await getUserIdByFirebaseUid(firebaseUid);
      const content = await prisma.content.findUnique({
        where: { id },
      });
      if (!content) {
        throw new GraphQLError("Content not found");
      }
      return content;
    },
    // Get a unique dashboard for a user by firebaseUid and dashboardId
    async getDashboard(
      _: any,
      {
        firebaseUid,
        dashboardId,
      }: { firebaseUid: string; dashboardId: string },
    ) {
      const userId = await getUserIdByFirebaseUid(firebaseUid);
      const dashboard = await prisma.dashboard.findUnique({
        where: { id: dashboardId },
      });
      if (!dashboard) {
        throw new GraphQLError("Dashboard not found");
      }
      if (dashboard.userId !== userId) {
        throw new GraphQLError("Unauthorized access to dashboard");
      }
      return dashboard;
    },
    // Get all dashboards for a user by firebaseUid
    async getDashboards(_: any, { firebaseUid }: { firebaseUid: string }) {
      const userId = await getUserIdByFirebaseUid(firebaseUid);
      const dashboards = await prisma.dashboard.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          publicUrl: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
      return dashboards;
    },
    // Get all nodes and edges in a dashboard's knowledge graph
    async getGraph(
      _: any,
      {
        firebaseUid,
        dashboardId,
      }: { firebaseUid: string; dashboardId: string },
    ) {
      // Validate user exists in Postgres
      await getUserIdByFirebaseUid(firebaseUid);
      const session = neo4jDriver.session();
      try {
        // Get all tags that describe content for this dashboard and their content nodes
        const tag_to_content = await session.run(
          `
          MATCH (tag:Tag)-[:DESCRIBES]->(content:Content {dashboardId: $dashboardId})
          RETURN DISTINCT tag AS t, content AS c
          `,
          { dashboardId },
        );

        // Get all HAS_SUBTAG relationships (start/end ids) across tags
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
              // Prefer the contentId property stored on the node (this is the Postgres content id)
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

        // Safely handle empty tag_to_tag.records and normalize ids
        const subtagRels = tag_to_tag.records[0]?.get("subtagRels") || [];
        subtagRels.forEach((rel: any) => {
          const start =
            rel.start && rel.start.toNumber ? rel.start.toNumber() : rel.start;
          const end =
            rel.end && rel.end.toNumber ? rel.end.toNumber() : rel.end;
          edges.push({
            from: `tag_${start}`,
            to: `tag_${end}`,
            type: "HAS_SUBTAG",
          });
        });

        return {
          nodes: Array.from(nodesMap.values()),
          edges,
        };
      } finally {
        await session.close();
      }
    },
    // Get all tags from Neo4j
    async allTags(_: any, { limit }: { limit?: number }) {
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
  },
  Mutation: {
    // User management mutations
    async login(_: any, { idToken }: { idToken: string }) {
      let decodedToken;
      try {
        decodedToken = await getAdminAuth().verifyIdToken(idToken);
      } catch (error) {
        throw new GraphQLError("Invalid Firebase ID token");
      }

      const firebaseUid = decodedToken.uid;

      const user = await prisma.user.findUnique({
        where: { firebaseUid },
      });

      if (!user) {
        throw new GraphQLError(
          "User not found. Please create an account first.",
        );
      }

      // Generate JWT token for your app
      const token = jwt.sign(
        { userId: user.id, email: user.email, firebaseUid: firebaseUid },
        JWT_SECRET,
        { expiresIn: "24h" },
      );

      return {
        user: user,
        token,
      };
    },
    async createUser(
      _: any,
      {
        idToken,
        firstName,
        lastName,
      }: { idToken: string; firstName: string; lastName: string },
    ) {
      let decodedToken;
      try {
        decodedToken = await getAdminAuth().verifyIdToken(idToken);
      } catch (error) {
        throw new GraphQLError("Invalid Firebase ID token");
      }

      const firebaseUid = decodedToken.uid;
      const email = decodedToken.email;

      if (!email) {
        throw new GraphQLError("Email not found in Firebase token");
      }

      // Check if user already exists by firebaseUid
      const existingUser = await prisma.user.findUnique({
        where: { firebaseUid },
      });

      if (existingUser) {
        throw new GraphQLError("User with this Firebase UID already exists");
      }

      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          firebaseUid,
        },
      });

      // Generate JWT token for your app
      const token = jwt.sign(
        { id: user.id, email: user.email, firebaseUid: firebaseUid },
        JWT_SECRET,
        { expiresIn: "24h" },
      );

      return {
        user: user,
        token,
      };
    },
    // Add new content, generate tags using LLM, insert into Postgres and Neo4j
    async addContent(
      _: any,
      {
        firebaseUid,
        dashboardId,
        title,
        type,
        properties,
      }: {
        firebaseUid: string;
        dashboardId: string;
        title: string;
        type: string;
        properties: any;
      },
    ) {
      const userId = await getUserIdByFirebaseUid(firebaseUid);

      // Verify that the dashboard belongs to the user
      const dashboard = await prisma.dashboard.findUnique({
        where: { id: dashboardId },
      });

      if (!dashboard || dashboard.userId !== userId) {
        throw new GraphQLError("Dashboard not found or unauthorized");
      }

      const content = await prisma.content.create({
        data: {
          dashboardId,
          title,
          type,
          properties,
        },
      });

      // Update dashboard's updatedAt timestamp
      await prisma.dashboard.update({
        where: { id: dashboardId },
        data: { updatedAt: new Date() },
      });

      const contentId = content.id;

      // 2. Call LLM service to generate tags
      let tags = [];
      try {
        const llmRes = await axios.post("http://localhost:8000/suggest-tags", {
          title,
          description: properties?.description || "",
        });
        tags = llmRes.data.suggested_tags;
      } catch (e) {
        console.error("LLM tag service error:", e);
        // Continue without tags if LLM service fails
      }

      // 3. For each tag, update/create in Neo4j
      const session = neo4jDriver.session();
      try {
        for (const tagName of tags) {
          // Check if tag exists
          const tagRes = await session.run(
            `
            MERGE (t:Tag {name: $tagName})
            ON CREATE SET t.popularity = 1
            ON MATCH SET t.popularity = t.popularity + 1
            RETURN t
          `,
            { tagName },
          );
          // Create Content node
          await session.run(
            `
            MERGE (c:Content {dashboardId: $dashboardId, contentId: $contentId, title: $title})
            `,
            { dashboardId, contentId, title },
          );
          // Create DESCRIBES relationship
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
    // Update existing content
    async updateContent(
      _: any,
      {
        id,
        title,
        type,
        properties,
      }: { id: string; title: string; type: string; properties: any },
    ) {
      const content = await prisma.content.findUnique({
        where: { id },
      });

      if (!content) {
        throw new GraphQLError("Content not found");
      }

      const updatedContent = await prisma.content.update({
        where: { id },
        data: {
          title,
          type,
          properties,
        },
      });

      // Update dashboard's updatedAt timestamp
      await prisma.dashboard.update({
        where: { id: content.dashboardId },
        data: { updatedAt: new Date() },
      });

      return updatedContent;
    },
    // Delete content from both Postgres and Neo4j
    async deleteContent(_: any, { id }: { id: string }) {
      const content = await prisma.content.findUnique({
        where: { id },
      });

      if (!content) {
        return false;
      }

      const session = neo4jDriver.session();
      try {
        const neo4jResult = await session.run(
          `MATCH (c:Content {contentId: $contentId}) DETACH DELETE c RETURN count(c) as deleted`,
          { contentId: id },
        );
        const deletedCount =
          neo4jResult.records[0]?.get("deleted")?.toNumber() || 0;

        const deleteContent = await prisma.content.delete({
          where: { id },
        });

        return deleteContent !== null && deletedCount > 0;
      } finally {
        await session.close();
      }
    },
    // Create a new dashboard for a user
    async createDashboard(
      _: any,
      { firebaseUid, name }: { firebaseUid: string; name: string },
    ) {
      const userId = await getUserIdByFirebaseUid(firebaseUid);

      const dashboard = await prisma.dashboard.create({
        data: {
          name,
          user: {
            connect: { id: userId },
          },
        },
      });

      return dashboard;
    },
  },
};
