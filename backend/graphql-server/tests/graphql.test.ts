jest.mock("../src/db/neo4j", () => ({
  neo4jDriver: { session: jest.fn() },
}));
jest.mock("../src/lib/prisma", () => {
  const { mockPrisma } = jest.requireActual("../__mocks__/prisma.js");
  return { prisma: mockPrisma };
});

jest.mock("neo4j-driver");
jest.mock("firebase-admin");
jest.mock("../src/auth", () => ({ requireUser: jest.fn() }));

import * as firebaseAdminMock from "../__mocks__/firebase-admin";

jest.mock("firebase-admin/auth", () => ({
  getAuth: firebaseAdminMock.auth,
}));

import { ApolloServer } from "@apollo/server";
import { resolvers } from "../src/graphql/resolvers";
import { typeDefs } from "../src/schema";
import nock from "nock";
import { neo4jDriver } from "../src/db/neo4j";
import {
  mockVerifyIdToken,
  auth as mockAuth,
} from "../__mocks__/firebase-admin";
import { mockPrisma } from "../__mocks__/prisma.js";
import { requireUser } from "../src/auth";

const MOCK_LLM_RESPONSE = [
  "software engineering",
  "databases",
  "system design",
];

describe("GraphQL Resolvers", () => {
  let server: ApolloServer;
  let neo4jSessionMock: any;

  beforeAll(() => {
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
  });

  beforeEach(() => {
    jest.resetAllMocks();

    // Reset requireUser mock default to authenticated user
    (requireUser as jest.Mock).mockImplementation(() => ({ id: "1" }));

    // Restore auth mock implementation after resetAllMocks
    mockAuth.mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken,
    }));

    // Mock database connection methods
    neo4jSessionMock = {
      run: jest.fn(),
      close: jest.fn(),
    };
    (neo4jDriver.session as jest.Mock).mockReturnValue(neo4jSessionMock);

    // Mock HTTP request to LLM service
    nock("http://localhost:8000")
      .post("/suggest-tags")
      .reply(200, { suggested_tags: MOCK_LLM_RESPONSE });
  });

  afterEach(() => {
    nock.cleanAll();
    if (neo4jSessionMock && neo4jSessionMock.run) {
      neo4jSessionMock.run.mockReset();
    }
    if (neo4jSessionMock && neo4jSessionMock.close) {
      neo4jSessionMock.close.mockReset && neo4jSessionMock.close.mockReset();
    }
  });

  // Query - content
  it("should return error when contentId does not exist in Postgres", async () => {
    mockPrisma.content.findUnique.mockResolvedValueOnce(null);
    const res = await server.executeOperation({
      query: `query($id: ID!) { getContent(id: $id) { title } }`,
      variables: { id: "999" },
    });
    const errors = (res as any).body?.singleResult?.errors;
    expect(errors).toBeDefined();
    expect(errors?.[0].message).toMatch(/Content not found/);
  });

  it("should return the correct content object when contentId exists", async () => {
    mockPrisma.content.findUnique.mockResolvedValueOnce({
      id: "1",
      title: "Test Content",
    });
    const res = await server.executeOperation({
      query: `query($id: ID!) { getContent(id: $id) { title } }`,
      variables: { id: "1" },
    });
    const data = (res as any).body.singleResult.data;
    expect(data.getContent.title).toBe("Test Content");
  });

  // Query - get_user_graph
  it("should return an error when firebaseUid does not exist in Neo4j/Postgres", async () => {
    // Simulate unauthenticated / missing user via requireUser
    (requireUser as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Unauthenticated");
    });
    neo4jSessionMock.run.mockResolvedValueOnce({ records: [] });

    const res = await server.executeOperation({
      query: `query($dashboardId: ID!) { getGraph(dashboardId: $dashboardId) { nodes { id } edges { from to } } }`,
      variables: {
        dashboardId: "dashboard-1",
      },
    });
    const errors = (res as any).body?.singleResult?.errors;
    expect(errors).toBeDefined();
    expect(errors?.[0].message).toMatch(/Unauthenticated/);
  });

  it("should return all relevant nodes and edges for a dashboard that exists", async () => {
    // Ensure requireUser returns a valid user id
    (requireUser as jest.Mock).mockImplementationOnce(() => ({ id: "1" }));

    // Mock Neo4j to return records for nodes and edges in the expected structure
    neo4jSessionMock.run
      // First call: tag_to_content query
      .mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              if (key === "t") {
                return {
                  identity: "tag1",
                  properties: { name: "software engineering" },
                };
              } else if (key === "c") {
                return {
                  identity: "content1",
                  properties: { title: "Test Content", contentId: "content1" },
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
      query: `query($dashboardId: ID!) { getGraph(dashboardId: $dashboardId) { nodes { id label contentId name title } edges { from to type } } }`,
      variables: {
        dashboardId: "dashboard-1",
      },
    });

    const data = (res as any).body.singleResult.data;
    expect(data.getGraph).not.toBeNull();
    expect(Array.isArray(data.getGraph.nodes)).toBe(true);
    expect(data.getGraph.nodes.length).toBe(2);
    expect(Array.isArray(data.getGraph.edges)).toBe(true);
    expect(data.getGraph.edges.length).toBe(2);

    // Check that we have the expected nodes
    const nodeIds = data.getGraph.nodes.map((n: any) => n.id);
    expect(nodeIds).toEqual(
      expect.arrayContaining(["tag_tag1", "content_content1"]),
    );

    // Check that we have the expected edges
    const edgeTypes = data.getGraph.edges.map((e: any) => e.type);
    expect(edgeTypes).toEqual(
      expect.arrayContaining(["DESCRIBES", "HAS_SUBTAG"]),
    );

    // Check node properties - content node should have contentId, tag node should have name
    const tagNode = data.getGraph.nodes.find((n: any) => n.id === "tag_tag1");
    expect(tagNode).toMatchObject({
      label: "tag",
      name: "software engineering",
      contentId: null, // Tag nodes have no contentId
    });

    const contentNode = data.getGraph.nodes.find(
      (n: any) => n.id === "content_content1",
    );
    expect(contentNode).toMatchObject({
      label: "content",
      contentId: "content1", // Content nodes have contentId
      name: null, // Content nodes have no name
      title: "Test Content", // Content nodes have title
    });
  });

  // Mutation - addContent
  it("should successfully add content and create tags/relationships in Neo4j when userId exists", async () => {
    // Mock Prisma responses
    // First call: Look up user
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: "1" });
    // Second call: Verify dashboard belongs to user
    mockPrisma.dashboard.findUnique.mockResolvedValueOnce({
      id: "dashboard-1",
      userId: "1",
      name: "Test Dashboard",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // Third call: Create content and return the created content
    mockPrisma.content.create.mockResolvedValueOnce({
      id: "1",
      title: "New Content",
      userId: "1",
      type: null,
      createdAt: new Date(),
      notesText: null,
      notesJSON: null,
    });
    // Fourth call: Update dashboard's updatedAt timestamp
    mockPrisma.dashboard.update.mockResolvedValueOnce({
      id: "dashboard-1",
      userId: "1",
      name: "Test Dashboard",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mock Neo4j responses for tag operations
    neo4jSessionMock.run.mockResolvedValueOnce({
      records: [{ get: () => "1" }],
    });

    const res = await server.executeOperation({
      query: `mutation($dashboardId: ID!, $title: String!) { addContent(dashboardId: $dashboardId, title: $title) { id title } }`,
      variables: {
        dashboardId: "dashboard-1",
        title: "New Content",
      },
    });

    const data = (res as any).body.singleResult.data;
    expect(data.addContent.title).toBe("New Content");
    // Check Neo4j for created nodes and relationships
    expect(neo4jSessionMock.run).toHaveBeenCalled();
    // Verify that dashboard.update was called to update the updatedAt timestamp
    expect(mockPrisma.dashboard.update).toHaveBeenCalledWith({
      where: { id: "dashboard-1" },
      data: { updatedAt: expect.any(Date) },
    });
  });

  it("should throw an error if userId does not exist in Postgres", async () => {
    // Simulate unauthenticated / missing user via requireUser
    (requireUser as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Unauthenticated");
    });

    const res = await server.executeOperation({
      query: `mutation($dashboardId: ID!, $title: String!) { addContent(dashboardId: $dashboardId, title: $title) { id title } }`,
      variables: {
        dashboardId: "dashboard-1",
        title: "New Content",
      },
    });
    const errors = (res as any).body?.singleResult?.errors;
    expect(errors).toBeDefined();
    expect(errors?.[0].message).toMatch(/Unauthenticated/);
  });

  // Mutation - deleteContent
  it("should return false if contentId does not exist in Postgres/Neo4j", async () => {
    mockPrisma.content.findUnique.mockResolvedValueOnce(null);
    const res = await server.executeOperation({
      query: `mutation($id: ID!) { deleteContent(id: $id) }`,
      variables: { id: "999" },
    });
    const data = (res as any).body.singleResult.data;
    expect(data.deleteContent).toBe(false);
  });

  it("should delete the content from both Postgres and Neo4j and return true when contentId exists", async () => {
    // First call: Check if content exists
    mockPrisma.content.findUnique.mockResolvedValueOnce({ id: "1" });
    // Mock Prisma delete
    mockPrisma.content.delete.mockResolvedValueOnce({ id: "1" });

    // Mock Neo4j deletion with count
    neo4jSessionMock.run.mockResolvedValueOnce({
      records: [
        {
          get: (key: string) => {
            if (key === "deleted") {
              return { toNumber: () => 1 };
            }
            return undefined;
          },
        },
      ],
    });

    const res = await server.executeOperation({
      query: `mutation($id: ID!) { deleteContent(id: $id) }`,
      variables: { id: "1" },
    });
    const data = (res as any).body.singleResult.data;
    expect(data.deleteContent).toBe(true);
    // Check Neo4j for deleted nodes and relationships
    expect(neo4jSessionMock.run).toHaveBeenCalled();
  });

  // User Management Tests
  describe("User Management", () => {
    // Mutation - createUser
    it("should successfully create a new user", async () => {
      const mockUser = {
        id: "new-user-123",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        firebaseUid: "firebase-uid-456",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock Firebase token verification
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: "firebase-uid-456",
        email: "jane@example.com",
      });

      // Mock check for existing user
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      // Mock check for existing user by email
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      // Mock user creation
      mockPrisma.user.create.mockResolvedValueOnce(mockUser);

      const res = await server.executeOperation({
        query: `mutation($idToken: String!, $firstName: String!, $lastName: String!) { 
          createUser(idToken: $idToken, firstName: $firstName, lastName: $lastName) { 
            user { id firstName lastName email firebaseUid createdAt } 
            token 
          } 
        }`,
        variables: {
          idToken: "valid-firebase-token",
          firstName: "Jane",
          lastName: "Smith",
        },
      });

      const data = (res as any).body.singleResult.data;
      expect(data.createUser.user).toMatchObject({
        id: "new-user-123",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        firebaseUid: "firebase-uid-456",
      });
      expect(data.createUser.token).toBeDefined();
    });

    it("should return error when creating user with existing Firebase UID", async () => {
      // Mock Firebase token verification
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: "firebase-uid-existing",
        email: "existing@example.com",
      });

      // Mock user already exists by firebaseUid
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        firebaseUid: "firebase-uid-existing",
      });

      const res = await server.executeOperation({
        query: `mutation($idToken: String!, $firstName: String!, $lastName: String!) { 
          createUser(idToken: $idToken, firstName: $firstName, lastName: $lastName) { 
            user { id } 
            token 
          } 
        }`,
        variables: {
          idToken: "valid-firebase-token",
          firstName: "John",
          lastName: "Doe",
        },
      });

      const errors = (res as any).body?.singleResult?.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0].message).toMatch(
        "User with this Firebase UID already exists",
      );
    });
  });
  // Mutation - updateContent
  describe("Content Updates", () => {
    it("should successfully update content title", async () => {
      const mockContent = {
        id: "content-1",
        userId: "user-123",
        dashboardId: "dashboard-1",
        title: "Original Title",
        type: "article",
        createdAt: new Date(),
        notesText: "Original description",
        notesJSON: null,
      };

      const updatedContent = {
        ...mockContent,
        title: "Updated Title",
      };

      // Mock content exists
      mockPrisma.content.findUnique.mockResolvedValueOnce(mockContent);

      // Mock update successful
      mockPrisma.content.update.mockResolvedValueOnce(updatedContent);

      // Mock dashboard update for updatedAt timestamp
      mockPrisma.dashboard.update.mockResolvedValueOnce({
        id: "dashboard-1",
        userId: "user-123",
        name: "Test Dashboard",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await server.executeOperation({
        query: `mutation($id: ID!, $title: String) { 
          updateContent(id: $id, title: $title) { 
            id title type notesText notesJSON
          } 
        }`,
        variables: {
          id: "content-1",
          title: "Updated Title",
        },
      });

      const data = (res as any).body.singleResult.data;
      expect(data.updateContent).toMatchObject({
        id: "content-1",
        title: "Updated Title",
        type: "article",
      });
      // Verify that dashboard.update was called to update the updatedAt timestamp
      expect(mockPrisma.dashboard.update).toHaveBeenCalledWith({
        where: { id: "dashboard-1" },
        data: { updatedAt: expect.any(Date) },
      });
    });

    it("should successfully update content type and notes", async () => {
      const mockContent = {
        id: "content-1",
        userId: "user-123",
        dashboardId: "dashboard-1",
        title: "Test Content",
        type: "article",
        createdAt: new Date(),
        notesText: "Original description",
        notesJSON: null,
      };

      const updatedContent = {
        id: "content-1",
        userId: "user-123",
        dashboardId: "dashboard-1",
        title: "Test Content",
        type: "tutorial",
        createdAt: new Date(),
        notesText: "Updated description",
        notesJSON: null,
      };

      // Mock content exists
      mockPrisma.content.findUnique.mockResolvedValueOnce(mockContent);

      // Mock update successful
      mockPrisma.content.update.mockResolvedValueOnce(updatedContent);

      // Mock dashboard update for updatedAt timestamp
      mockPrisma.dashboard.update.mockResolvedValueOnce({
        id: "dashboard-1",
        userId: "user-123",
        name: "Test Dashboard",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await server.executeOperation({
        query: `mutation($id: ID!, $type: String, $notesText: String, $notesJSON: JSON) { 
          updateContent(id: $id, type: $type, notesText: $notesText, notesJSON: $notesJSON) { 
            id title type notesText notesJSON
          } 
        }`,
        variables: {
          id: "content-1",
          type: "tutorial",
          notesText: "Updated description",
          notesJSON: null,
        },
      });

      const data = (res as any).body.singleResult.data;
      expect(data.updateContent).toMatchObject({
        id: "content-1",
        title: "Test Content",
        type: "tutorial",
        notesText: "Updated description",
        notesJSON: null,
      });
      // Verify that dashboard.update was called to update the updatedAt timestamp
      expect(mockPrisma.dashboard.update).toHaveBeenCalledWith({
        where: { id: "dashboard-1" },
        data: { updatedAt: expect.any(Date) },
      });
    });

    it("should return existing content when no updates provided", async () => {
      const mockContent = {
        id: "content-1",
        userId: "user-123",
        dashboardId: "dashboard-1",
        title: "Test Content",
        type: "article",
        createdAt: new Date(),
        notesText: "Test description",
        notesJSON: null,
      };

      // Mock content exists
      mockPrisma.content.findUnique.mockResolvedValueOnce(mockContent);

      // Mock update returns same content (no changes provided)
      mockPrisma.content.update.mockResolvedValueOnce(mockContent);

      // Mock dashboard update for updatedAt timestamp
      mockPrisma.dashboard.update.mockResolvedValueOnce({
        id: "dashboard-1",
        userId: "user-123",
        name: "Test Dashboard",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await server.executeOperation({
        query: `mutation($id: ID!) { 
          updateContent(id: $id) { 
            id title type notesText notesJSON
          } 
        }`,
        variables: {
          id: "content-1",
        },
      });

      const data = (res as any).body.singleResult.data;
      expect(data.updateContent).toMatchObject({
        id: "content-1",
        title: "Test Content",
        type: "article",
        notesText: "Test description",
        notesJSON: null,
      });
      // Verify that dashboard.update was called to update the updatedAt timestamp
      expect(mockPrisma.dashboard.update).toHaveBeenCalledWith({
        where: { id: "dashboard-1" },
        data: { updatedAt: expect.any(Date) },
      });
    });

    it("should return error when content does not exist", async () => {
      // Mock content doesn't exist
      mockPrisma.content.findUnique.mockResolvedValueOnce(null);

      const res = await server.executeOperation({
        query: `mutation($id: ID!, $title: String) { 
          updateContent(id: $id, title: $title) { 
            id title 
          } 
        }`,
        variables: {
          id: "nonexistent-content",
          title: "Updated Title",
        },
      });

      const errors = (res as any).body?.singleResult?.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0].message).toMatch("Content not found");
    });
  });

  // Mutation - createDashboard
  describe("createDashboard", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should create a new dashboard for a user", async () => {
      const mockUser = {
        id: "user-123",
        firebaseUid: "test-firebase-uid",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
      };

      const mockDashboard = {
        id: "dashboard-123",
        userId: "user-123",
        name: "My Dashboard",
        createdAt: new Date("2026-01-18"),
        updatedAt: new Date("2026-01-18"),
        visibility: "PRIVATE",
      };

      // Ensure requireUser returns the expected user
      (requireUser as jest.Mock).mockImplementationOnce(() => ({
        id: "user-123",
      }));

      // Mock dashboard creation
      mockPrisma.dashboard.create.mockResolvedValueOnce(mockDashboard);

      const res = await server.executeOperation({
        query: `mutation($name: String!) { 
          createDashboard(name: $name) { 
            id userId name createdAt updatedAt visibility
          } 
        }`,
        variables: {
          name: "My Dashboard",
        },
      });

      const data = (res as any).body.singleResult.data;
      expect(data.createDashboard).toMatchObject({
        id: "dashboard-123",
        userId: "user-123",
        name: "My Dashboard",
      });

      // Verify dashboard.create was called to create the dashboard
      expect(mockPrisma.dashboard.create).toHaveBeenCalledWith({
        data: {
          name: "My Dashboard",
          user: {
            connect: { id: "user-123" },
          },
        },
      });
    });

    it("should throw an error if user does not exist", async () => {
      // Simulate unauthenticated / missing user via requireUser
      (requireUser as jest.Mock).mockImplementationOnce(() => {
        throw new Error("Unauthenticated");
      });

      const res = await server.executeOperation({
        query: `mutation($name: String!) { 
          createDashboard(name: $name) { 
            id name 
          } 
        }`,
        variables: {
          name: "My Dashboard",
        },
      });

      const errors = (res as any).body?.singleResult?.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0].message).toMatch(/Unauthenticated/);

      // Verify dashboard.create was never called
      expect(mockPrisma.dashboard.create).not.toHaveBeenCalled();
    });
  });

  // Mutation - publish/unpublish dashboard
  describe("publish/unpublishDashboard", () => {
    it("should publish a dashboard and generate a publicSlug when none exists", async () => {
      // Dashboard exists and belongs to user (requireUser returns {id: '1'} by default)
      mockPrisma.dashboard.findUnique.mockResolvedValueOnce({
        id: "dashboard-1",
        userId: "1",
        publicSlug: null,
        publishedAt: null,
      });

      // Mock update to return the dashboard with visibility PUBLIC and a publicSlug
      mockPrisma.dashboard.update.mockResolvedValueOnce({
        id: "dashboard-1",
        userId: "1",
        visibility: "PUBLIC",
        publicSlug: "generated-slug",
        publishedAt: new Date(),
      });

      const res = await server.executeOperation({
        query: `mutation($dashboardId: ID!) { publishDashboard(dashboardId: $dashboardId) { id visibility publicSlug publishedAt } }`,
        variables: { dashboardId: "dashboard-1" },
      });

      const data = (res as any).body.singleResult.data;
      expect(data.publishDashboard).toBeDefined();
      expect(data.publishDashboard.visibility).toBe("PUBLIC");
      expect(data.publishDashboard.publicSlug).toBe("generated-slug");
      expect(mockPrisma.dashboard.update).toHaveBeenCalled();
    });

    it("should unpublish a dashboard and set visibility to PRIVATE", async () => {
      // Dashboard exists and belongs to user
      mockPrisma.dashboard.findUnique.mockResolvedValueOnce({
        id: "dashboard-1",
        userId: "1",
        visibility: "PUBLIC",
        publicSlug: "existing-slug",
      });

      mockPrisma.dashboard.update.mockResolvedValueOnce({
        id: "dashboard-1",
        userId: "1",
        visibility: "PRIVATE",
        publicSlug: null,
      });

      const res = await server.executeOperation({
        query: `mutation($dashboardId: ID!) { unpublishDashboard(dashboardId: $dashboardId) { id visibility publicSlug } }`,
        variables: { dashboardId: "dashboard-1" },
      });

      const data = (res as any).body.singleResult.data;
      expect(data.unpublishDashboard).toBeDefined();
      expect(data.unpublishDashboard.visibility).toBe("PRIVATE");
      expect(mockPrisma.dashboard.update).toHaveBeenCalledWith({
        where: { id: "dashboard-1" },
        data: { visibility: expect.any(String) },
      });
    });
  });
});
