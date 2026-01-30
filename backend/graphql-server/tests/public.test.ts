const neo4jMock = require("../__mocks__/neo4j");
jest.mock("../src/db/neo4j", () => neo4jMock);

jest.mock("../src/lib/prisma", () => {
  const { mockPrisma } = require("../__mocks__/prisma");
  return { prisma: mockPrisma };
});

jest.mock("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
    DashboardVisibility: {
      PUBLIC: "PUBLIC",
      PRIVATE: "PRIVATE",
    },
  };
});

jest.mock("neo4j-driver");
jest.mock("firebase-admin");

import * as firebaseAdminMock from "../__mocks__/firebase-admin";

jest.mock("firebase-admin/auth", () => ({
  getAuth: firebaseAdminMock.auth,
}));

import { ApolloServer } from "@apollo/server";
import { resolvers } from "../src/graphql/resolvers";
import { typeDefs } from "../src/schema";
import { neo4jDriver } from "../src/db/neo4j";
import { mockPrisma } from "../__mocks__/prisma.js";

describe("Public GraphQL endpoints", () => {
  let server: ApolloServer;
  let neo4jSessionMock: any;

  beforeAll(() => {
    server = new ApolloServer({
      typeDefs,
      resolvers,
    });
  });

  beforeEach(() => {
    jest.resetAllMocks();

    neo4jSessionMock = {
      run: jest.fn(),
      close: jest.fn(),
    };
    (neo4jDriver.session as jest.Mock).mockReturnValue(neo4jSessionMock);
  });

  it("should return a public dashboard when publicSlug exists", async () => {
    mockPrisma.dashboard.findUnique.mockResolvedValueOnce({
      id: "dashboard-public",
      name: "Public Dashboard",
      visibility: "PUBLIC",
      publicSlug: "public-slug",
    });

    const res = await server.executeOperation({
      query: `query($publicSlug: String!) { getPublicDashboard(publicSlug: $publicSlug) { id name visibility publicSlug } }`,
      variables: { publicSlug: "public-slug" },
    });

    const data = (res as any).body.singleResult.data;
    expect(data.getPublicDashboard).toMatchObject({
      id: "dashboard-public",
      name: "Public Dashboard",
      visibility: "PUBLIC",
      publicSlug: "public-slug",
    });
  });

  it("should return nodes and edges for a public dashboard graph", async () => {
    // Mock dashboard lookup to be public
    mockPrisma.dashboard.findUnique.mockResolvedValueOnce({
      id: "dashboard-public",
      visibility: "PUBLIC",
    });

    // Mock Neo4j to return records for nodes and edges similar to getGraph
    neo4jSessionMock.run
      // First call: tag_to_content query
      .mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              if (key === "t") {
                return {
                  identity: "tag1",
                  properties: { name: "public-tag" },
                };
              } else if (key === "c") {
                return {
                  identity: "content1",
                  properties: {
                    title: "Public Content",
                    contentId: "content1",
                  },
                };
              }
              return undefined;
            },
          },
        ],
      })
      // Second call: tag_to_tag query
      .mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              if (key === "subtagRels") {
                return [{ start: "tag1", end: "tag2" }];
              }
              return undefined;
            },
          },
        ],
      });

    const res = await server.executeOperation({
      query: `query($dashboardId: ID!) { getPublicGraph(dashboardId: $dashboardId) { nodes { id label contentId name title } edges { from to type } } }`,
      variables: { dashboardId: "dashboard-public" },
    });

    const data = (res as any).body.singleResult.data;
    expect(data.getPublicGraph).not.toBeNull();
    expect(Array.isArray(data.getPublicGraph.nodes)).toBe(true);
    expect(Array.isArray(data.getPublicGraph.edges)).toBe(true);

    const nodeIds = data.getPublicGraph.nodes.map((n: any) => n.id);
    expect(nodeIds).toEqual(
      expect.arrayContaining(["tag_tag1", "content_content1"]),
    );

    const edgeTypes = data.getPublicGraph.edges.map((e: any) => e.type);
    expect(edgeTypes).toEqual(
      expect.arrayContaining(["DESCRIBES", "HAS_SUBTAG"]),
    );
  });
});
