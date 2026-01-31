import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Neo4jContainer } from "@testcontainers/neo4j";
import axios from "axios";
import nock from "nock";

const authMock = require("../__mocks__/auth");
jest.mock("../src/auth", () => authMock);

describe("Integration Tests", () => {
  let server: ApolloServer | undefined;
  let url: string;

  let pgContainer: any;
  let neo4jContainer: any;

  let prisma: any;
  let neo4jDriver: any;
  let typeDefs: any;
  let resolvers: any;

  beforeAll(async () => {
    jest.setTimeout(120_000);

    try {
      pgContainer = await new PostgreSqlContainer("postgres:15")
        .withDatabase("testdb")
        .withUsername("testuser")
        .withPassword("testpass")
        .start();

      neo4jContainer = await new Neo4jContainer("neo4j:5")
        .withPassword("testpass")
        .start();

      process.env.PG_HOST = pgContainer.getHost();
      process.env.PG_PORT = String(pgContainer.getPort());
      process.env.PG_USER = pgContainer.getUsername();
      process.env.PG_PASSWORD = pgContainer.getPassword();
      process.env.PG_DATABASE = pgContainer.getDatabase();

      const boltUri = neo4jContainer.getBoltUri().replace(/\/$/, "");
      process.env.NEO4J_URI = boltUri;
      process.env.NEO4J_USERNAME = neo4jContainer.getUsername();
      process.env.NEO4J_PASSWORD = neo4jContainer.getPassword();

      process.env.LLM_TAGGING_SERVICE_URL = "http://localhost:8000";

      ({ typeDefs } = await import("../src/schema"));
      ({ resolvers } = await import("../src/graphql/resolvers"));
      ({ neo4jDriver } = await import("../src/db/neo4j"));

      ({ prisma } = await import("../src/lib/prisma"));

      const { execSync } = await import("child_process");
      try {
        execSync("npx prisma migrate deploy", {
          cwd: __dirname + "/..",
          stdio: "inherit",
          env: {
            ...process.env,
            DATABASE_URL: `postgresql://${process.env.PG_USER}:${process.env.PG_PASSWORD}@${process.env.PG_HOST}:${process.env.PG_PORT}/${process.env.PG_DATABASE}`,
          },
        });
      } catch (e) {
        throw e;
      }

      server = new ApolloServer({
        typeDefs,
        resolvers,
        formatError: (error) => {
          console.error("GraphQL Error:", error);
          return {
            message: error.message,
            path: error.path,
            extensions: error.extensions,
          };
        },
      });

      const started = await startStandaloneServer(server, {
        listen: { port: 4001 },
      });

      url = started.url;
    } catch (error) {
      throw error;
    }
  }, 120_000);

  afterAll(async () => {
    try {
      await server?.stop();
    } catch (e) {
      // ignore
    }

    try {
      await prisma?.$disconnect();
    } catch (e) {
      // ignore
    }

    try {
      await neo4jDriver?.close();
    } catch (e) {
      // ignore
    }

    try {
      await pgContainer?.stop();
    } catch (e) {
      // ignore
    }

    try {
      await neo4jContainer?.stop();
    } catch (e) {
      // ignore
    }
  });

  beforeEach(async () => {
    await cleanDatabases();
  });

  async function cleanDatabases() {
    if (prisma) {
      await prisma.content.deleteMany({});
      await prisma.dashboard.deleteMany({});
      await prisma.user.deleteMany({});
    }

    if (neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        await session.run("MATCH (n) DETACH DELETE n");
      } finally {
        await session.close();
      }
    }
  }

  describe("Content Management Flow", () => {
    async function postGraphQL(payload: any) {
      const resp = await axios.post(url, payload);
      if (resp.data?.errors) {
        throw new Error(JSON.stringify(resp.data.errors, null, 2));
      }
      if (
        !resp.data ||
        typeof resp.data !== "object" ||
        resp.data.data === undefined
      ) {
        throw new Error(
          `Unexpected GraphQL response: ${JSON.stringify(resp.data, null, 2)}`,
        );
      }
      return resp;
    }

    it("should retrieve user graph with nodes and edges", async () => {
      try {
        const llmScope = nock("http://localhost:8000")
          .persist()
          .post("/suggest-tags")
          .reply(200, { suggested_tags: ["alpha", "beta"] });

        const createUserMutation = `
        mutation CreateUser($firstName: String!, $lastName: String!) {
          createUser(firstName: $firstName, lastName: $lastName) {
            user { id }
          }
        }
      `;

        const createResp = await postGraphQL({
          query: createUserMutation,
          variables: {
            firstName: "Graph",
            lastName: "User",
          },
        });
        const userId = createResp.data.data.createUser.user.id;

        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const authMock = require("../src/auth");
          if (
            authMock &&
            authMock.requireUser &&
            authMock.requireUser.mockImplementation
          ) {
            authMock.requireUser.mockImplementation(() => ({
              id: userId,
              firebaseUid: "test-firebase-uid",
              email: "test@example.com",
            }));
          }
        } catch (e) {}
        const createDashboardMutation = `
        mutation CreateDashboard($name: String!) {
          createDashboard(name: $name) {
            id
          }
        }
      `;

        const dashboardResp = await postGraphQL({
          query: createDashboardMutation,
          variables: {
            name: "Test Dashboard",
          },
        });
        const dashboardId = dashboardResp.data.data.createDashboard.id;

        const addContentMutation = `
        mutation AddContent($dashboardId: ID!, $title: String!, $type: String) {
          addContent(dashboardId: $dashboardId, title: $title, type: $type) {
            id
          }
        }
      `;

        const addResp1 = await postGraphQL({
          query: addContentMutation,
          variables: {
            dashboardId,
            title: "First",
            type: "note",
          },
        });
        const contentId1 = addResp1.data.data.addContent.id;

        const addResp2 = await postGraphQL({
          query: addContentMutation,
          variables: {
            dashboardId,
            title: "Second",
            type: "note",
          },
        });
        const contentId2 = addResp2.data.data.addContent.id;

        const getGraphQuery = `
        query GetUserGraph($dashboardId: ID!) {
          getGraph(dashboardId: $dashboardId) {
            nodes { id label contentId name title }
            edges { from to type }
          }
        }
      `;

        const graphResp = await axios.post(url, {
          query: getGraphQuery,
          variables: { dashboardId },
        });
        const graph = graphResp.data.data.getGraph;
        expect(graph).toBeDefined();
        expect(Array.isArray(graph.nodes)).toBe(true);
        expect(Array.isArray(graph.edges)).toBe(true);

        const tagNodes = graph.nodes.filter((n: any) => n.label === "tag");
        const contentNodes = graph.nodes.filter(
          (n: any) => n.label === "content",
        );
        expect(tagNodes.length).toBeGreaterThanOrEqual(1);
        expect(contentNodes.length).toBeGreaterThanOrEqual(2);

        // Tags should include the LLM-suggested tags
        const tagNames = tagNodes.map((t: any) => t.name).filter(Boolean);
        expect(tagNames).toEqual(expect.arrayContaining(["alpha", "beta"]));

        // Content nodes should include the two contentIds returned from the mutation
        const returnedContentIds = contentNodes
          .map((c: any) => c.contentId)
          .filter(Boolean);
        expect(returnedContentIds).toEqual(
          expect.arrayContaining([contentId1, contentId2]),
        );

        // Build a map of nodes by id for easier edge validation
        const nodesById = new Map(graph.nodes.map((n: any) => [n.id, n]));

        // DESCRIBES edges should connect Tag -> Content
        const describesEdges = graph.edges.filter(
          (e: any) => e.type === "DESCRIBES",
        );
        expect(describesEdges.length).toBeGreaterThanOrEqual(2);

        describesEdges.forEach((e: any) => {
          const from = nodesById.get(e.from) as any;
          const to = nodesById.get(e.to) as any;
          // from should be a Tag node, to should be a Content node
          expect(from).toBeDefined();
          expect(to).toBeDefined();
          expect(from.label).toBe("tag");
          expect(to.label).toBe("content");
          // The content node referenced by the edge should have a contentId matching one we created
          expect([contentId1, contentId2]).toContain(to.contentId);
        });

        nock.cleanAll();
      } catch (error) {
        console.error("Test error:", error);
        throw error;
      }
    });
  });
});
