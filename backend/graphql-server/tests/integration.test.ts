import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Neo4jContainer } from "@testcontainers/neo4j";
import axios from "axios";
import nock from "nock";

// Mock firebase-admin for integration tests
jest.mock("firebase-admin", () => {
  const mockVerifyIdToken = jest.fn().mockResolvedValue({
    uid: "test-firebase-uid",
    email: "test@example.com",
  });

  return {
    auth: jest.fn(() => ({
      verifyIdToken: mockVerifyIdToken,
    })),
    credential: {
      cert: jest.fn(() => ({})),
    },
    initializeApp: jest.fn(),
  };
});

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
    console.log("🔧 Starting beforeAll hook...");
    jest.setTimeout(120_000);

    try {
      console.log("🐘 Starting Postgres container...");
      pgContainer = await new PostgreSqlContainer("postgres:15")
        .withDatabase("testdb")
        .withUsername("testuser")
        .withPassword("testpass")
        .start();
      console.log("✅ Postgres container started");

      console.log("🔗 Starting Neo4j container...");
      neo4jContainer = await new Neo4jContainer("neo4j:5")
        .withPassword("testpass")
        .start();
      console.log("✅ Neo4j container started");

      console.log("✅ Neo4j container started");

      process.env.PG_HOST = pgContainer.getHost();
      process.env.PG_PORT = String(pgContainer.getPort());
      process.env.PG_USER = pgContainer.getUsername();
      process.env.PG_PASSWORD = pgContainer.getPassword();
      process.env.PG_DATABASE = pgContainer.getDatabase();

      const boltUri = neo4jContainer.getBoltUri().replace(/\/$/, "");
      process.env.NEO4J_URI = boltUri;
      process.env.NEO4J_USERNAME = neo4jContainer.getUsername();
      process.env.NEO4J_PASSWORD = neo4jContainer.getPassword();

      console.log("📦 Importing schema and resolvers...");
      ({ typeDefs } = await import("../src/schema"));
      ({ resolvers } = await import("../src/graphql/resolvers"));
      console.log("✅ Schema and resolvers imported");

      console.log("🔗 Importing Neo4j driver...");
      ({ neo4jDriver } = await import("../src/db/neo4j"));
      console.log("✅ Neo4j driver imported");

      // Import and initialize Prisma Client
      console.log("💾 Importing Prisma...");
      ({ prisma } = await import("../src/lib/prisma"));
      console.log("✅ Prisma imported");

      // Run Prisma migrations
      console.log("🔄 Running Prisma migrations...");
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
        console.log("✅ Prisma migrations completed");
      } catch (e) {
        console.error("❌ Failed to run Prisma migrations:", e);
        throw e;
      }

      console.log("🚀 Starting Apollo Server...");
      console.log("🚀 Starting Apollo Server...");
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

      console.log("🌐 Starting standalone server...");
      const started = await startStandaloneServer(server, {
        listen: { port: 4001 },
      });

      url = started.url;
      console.log(`✅ Server started at ${url}`);
      console.log("✨ beforeAll hook completed successfully");
    } catch (error) {
      console.error("❌ Error in beforeAll hook:", error);
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
      console.log("TEST STARTING...");
      try {
        const llmScope = nock("http://localhost:8000")
          .persist()
          .post("/suggest-tags")
          .reply(200, { suggested_tags: ["alpha", "beta"] });

        console.log("Setting up nock...");

        const createUserMutation = `
        mutation CreateUser($idToken: String!, $firstName: String!, $lastName: String!) {
          createUser(idToken: $idToken, firstName: $firstName, lastName: $lastName) {
            user { id }
            token
          }
        }
      `;

        console.log("Creating user...");

        const createResp = await postGraphQL({
          query: createUserMutation,
          variables: {
            idToken: "mock-firebase-token",
            firstName: "Graph",
            lastName: "User",
          },
        });
        console.log("User created:", JSON.stringify(createResp.data, null, 2));
        const userId = createResp.data.data.createUser.user.id;
        const firebaseUid = "test-firebase-uid"; // From the mocked Firebase token

        const createDashboardMutation = `
        mutation CreateDashboard($firebaseUid: String!, $name: String!) {
          createDashboard(firebaseUid: $firebaseUid, name: $name) {
            id
          }
        }
      `;

        const dashboardResp = await postGraphQL({
          query: createDashboardMutation,
          variables: {
            firebaseUid,
            name: "Test Dashboard",
          },
        });
        const dashboardId = dashboardResp.data.data.createDashboard.id;

        const addContentMutation = `
        mutation AddContent($firebaseUid: String!, $dashboardId: ID!, $title: String!, $type: String, $properties: JSON) {
          addContent(firebaseUid: $firebaseUid, dashboardId: $dashboardId, title: $title, type: $type, properties: $properties) {
            id
          }
        }
      `;

        const addResp1 = await postGraphQL({
          query: addContentMutation,
          variables: {
            firebaseUid,
            dashboardId,
            title: "First",
            type: "note",
            properties: { description: "d1" },
          },
        });
        const contentId1 = addResp1.data.data.addContent.id;

        const addResp2 = await postGraphQL({
          query: addContentMutation,
          variables: {
            firebaseUid,
            dashboardId,
            title: "Second",
            type: "note",
            properties: { description: "d2" },
          },
        });
        const contentId2 = addResp2.data.data.addContent.id;

        const getGraphQuery = `
        query GetUserGraph($firebaseUid: String!) {
          get_user_graph(firebaseUid: $firebaseUid) {
            nodes { id label contentId name title }
            edges { from to type }
          }
        }
      `;

        const graphResp = await axios.post(url, {
          query: getGraphQuery,
          variables: { firebaseUid },
        });
        const graph = graphResp.data.data.get_user_graph;
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
