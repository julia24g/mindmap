import { ApolloServer } from '@apollo/server';
import { resolvers } from '../src/resolvers';
import { typeDefs } from '../src/schema';
import nock from 'nock';
import { pgPool } from '../src/db/postgres';
import { neo4jDriver } from '../src/db/neo4j';
import { mockVerifyIdToken, auth as mockAuth } from '../__mocks__/firebase-admin';

jest.mock('../src/db/postgres', () => ({
  pgPool: { query: jest.fn() }
}));
jest.mock('../src/db/neo4j', () => ({
  neo4jDriver: { session: jest.fn() }
}));

jest.mock('pg');
jest.mock('neo4j-driver');
jest.mock('firebase-admin');

const mockPgQuery = pgPool.query as jest.Mock;

const MOCK_LLM_RESPONSE = ["software engineering", "databases", "system design"];

describe('GraphQL Resolvers', () => {
  let server: ApolloServer;
  let neo4jSessionMock: any;

  beforeAll(() => {
    server = new ApolloServer({ 
      typeDefs, 
      resolvers,
      formatError: (error) => {
        console.error('GraphQL Error:', error);
        return {
          message: error.message,
          path: error.path,
          extensions: error.extensions
        };
      }
    });
  });

  beforeEach(() => {
    jest.resetAllMocks();
    
    // Restore auth mock implementation after resetAllMocks
    mockAuth.mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken,
    }));
    
    // Mock database connection methods
    mockPgQuery.mockReset();
    neo4jSessionMock = {
      run: jest.fn(),
      close: jest.fn()
    };
    (neo4jDriver.session as jest.Mock).mockReturnValue(neo4jSessionMock);

    // Mock HTTP request to LLM service
    nock('http://localhost:8000')
      .post('/suggest-tags')
      .reply(200, { suggested_tags: MOCK_LLM_RESPONSE });
  });

  afterEach(() => {
    nock.cleanAll();
    mockPgQuery.mockReset();
    if (neo4jSessionMock && neo4jSessionMock.run) {
      neo4jSessionMock.run.mockReset();
    }
    if (neo4jSessionMock && neo4jSessionMock.close) {
      neo4jSessionMock.close.mockReset && neo4jSessionMock.close.mockReset();
    }
  });

  // Query - content
  it('should return error when contentId does not exist in Postgres', async () => {
    mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ userid: '1' }] });
    mockPgQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await server.executeOperation({
      query: `query($contentId: ID!, $firebaseUid: String!) { content(contentId: $contentId, firebaseUid: $firebaseUid) { title } }`,
      variables: { contentId: '999', firebaseUid: 'test-firebase-uid' }
    });
    const errors = (res as any).body?.singleResult?.errors;
    expect(errors).toBeDefined();
    expect(errors?.[0].message).toMatch(/Content not found/);
  });

  it('should return the correct content object when contentId exists', async () => {
    mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ userid: '1' }] });
    mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ contentid: '1', title: 'Test Content' }] });
    const res = await server.executeOperation({
      query: `query($contentId: ID!, $firebaseUid: String!) { content(contentId: $contentId, firebaseUid: $firebaseUid) { title } }`,
      variables: { contentId: '1', firebaseUid: 'test-firebase-uid' }
    });
    const data = (res as any).body.singleResult.data;
    expect(data.content.title).toBe('Test Content');
  });

  // Query - get_user_graph
  it('should return an error when firebaseUid does not exist in Neo4j/Postgres', async () => {
    // Mock Postgres to return no user
    mockPgQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    neo4jSessionMock.run.mockResolvedValueOnce({ records: [] });

    const res = await server.executeOperation({
      query: `query($firebaseUid: String!) { get_user_graph(firebaseUid: $firebaseUid) { nodes { id } edges { from to } } }`,
      variables: { firebaseUid: 'nonexistent-firebase-uid' }
    });
    const errors = (res as any).body?.singleResult?.errors;
    expect(errors).toBeDefined();
    expect(errors?.[0].message).toMatch(/User not found/);
  });

  it('should return all relevant nodes and edges for a firebaseUid that exists', async () => {
    // Mock Postgres to return a user with userId when looking up by firebaseUid
    mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ userid: '1' }] });
    
    // Mock Neo4j to return records for nodes and edges in the expected structure
    neo4jSessionMock.run
      // First call: tag_to_content query
      .mockResolvedValueOnce({
        records: [
          { 
            get: (key: string) => {
              if (key === 't') {
                return { 
                  identity: 'tag1', 
                  properties: { name: 'software engineering' }
                };
              } else if (key === 'c') {
                return { 
                  identity: 'content1', 
                  properties: { title: 'Test Content', contentId: 'content1' }
                };
              }
              return undefined;
            }
          }
        ]
      })
      // Second call: tag_to_tag query
      .mockResolvedValueOnce({
        records: [
          { 
            get: (key: string) => {
              if (key === 'subtagRels') {
                return [
                  { start: 'tag1', end: 'tag2' }
                ];
              }
              return undefined;
            }
          }
        ]
      });

    const res = await server.executeOperation({
      query: `query($firebaseUid: String!) { get_user_graph(firebaseUid: $firebaseUid) { nodes { id label contentId name title } edges { from to type } } }`,
      variables: { firebaseUid: 'test-firebase-uid' }
    });
    
    const data = (res as any).body.singleResult.data;
    expect(data.get_user_graph).not.toBeNull();
    expect(Array.isArray(data.get_user_graph.nodes)).toBe(true);
    expect(data.get_user_graph.nodes.length).toBe(2);
    expect(Array.isArray(data.get_user_graph.edges)).toBe(true);
    expect(data.get_user_graph.edges.length).toBe(2);
    
    // Check that we have the expected nodes
    const nodeIds = data.get_user_graph.nodes.map((n: any) => n.id);
    expect(nodeIds).toEqual(expect.arrayContaining(['tag_tag1', 'content_content1']));
    
    // Check that we have the expected edges
    const edgeTypes = data.get_user_graph.edges.map((e: any) => e.type);
    expect(edgeTypes).toEqual(expect.arrayContaining(['DESCRIBES', 'HAS_SUBTAG']));
    
    // Check node properties - content node should have contentId, tag node should have name
    const tagNode = data.get_user_graph.nodes.find((n: any) => n.id === 'tag_tag1');
    expect(tagNode).toMatchObject({ 
      label: 'tag',
      name: 'software engineering',
      contentId: null  // Tag nodes have no contentId
    });
    
    const contentNode = data.get_user_graph.nodes.find((n: any) => n.id === 'content_content1');
    expect(contentNode).toMatchObject({ 
      label: 'content',
      contentId: 'content1',  // Content nodes have contentId
      name: null,  // Content nodes have no name
      title: 'Test Content'  // Content nodes have title
    });
  });

  // Mutation - addContent
  it('should successfully add content and create tags/relationships in Neo4j when userId exists', async () => {
    // Mock Postgres responses for both queries
    // First call: Look up user by firebaseUid
    mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ userid: '1' }] });
    // Second call: Insert content and return the created content
    mockPgQuery.mockResolvedValueOnce({ 
      rowCount: 1, 
      rows: [{ 
        contentid: '1', 
        title: 'New Content', 
        userId: '1',
        type: null,
        created_at: new Date(),
        properties: null
      }] 
    });
    
    // Mock Neo4j responses for tag operations
    neo4jSessionMock.run.mockResolvedValueOnce({ records: [{ get: () => '1' }] });

    const res = await server.executeOperation({
      query: `mutation($firebaseUid: String!, $title: String!) { addContent(firebaseUid: $firebaseUid, title: $title) { contentId title } }`,
      variables: { firebaseUid: 'test-firebase-uid', title: 'New Content' }
    });
    
    const data = (res as any).body.singleResult.data;
    expect(data.addContent.title).toBe('New Content');
    // Check Neo4j for created nodes and relationships
    expect(neo4jSessionMock.run).toHaveBeenCalled();
  });

  it('should throw an error if userId does not exist in Postgres', async () => {
    // Mock the user check to return no user
    mockPgQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await server.executeOperation({
      query: `mutation($firebaseUid: String!, $title: String!) { addContent(firebaseUid: $firebaseUid, title: $title) { contentId title } }`,
      variables: { firebaseUid: 'nonexistent-firebase-uid', title: 'New Content' }
    });
    const errors = (res as any).body?.singleResult?.errors;
    expect(errors).toBeDefined();
    expect(errors?.[0].message).toMatch('User not found');
  });

  // Mutation - deleteContent
  it('should return false if contentId does not exist in Postgres/Neo4j', async () => {
    mockPgQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await server.executeOperation({
      query: `mutation($contentId: ID!) { deleteContent(contentId: $contentId) }`,
      variables: { contentId: '999' }
    });
    const data = (res as any).body.singleResult.data;
    expect(data.deleteContent).toBe(false);
  });

  it('should delete the content from both Postgres and Neo4j and return true when contentId exists', async () => {
    // First call: Check if content exists
    mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ contentId: '1' }] });
    // Second call: Delete from Postgres
    mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });
    
    // Mock Neo4j deletion with count
    neo4jSessionMock.run.mockResolvedValueOnce({ 
      records: [{ 
        get: (key: string) => {
          if (key === 'deleted') {
            return { toNumber: () => 1 };
          }
          return undefined;
        }
      }] 
    });

    const res = await server.executeOperation({
      query: `mutation($contentId: ID!) { deleteContent(contentId: $contentId) }`,
      variables: { contentId: '1' }
    });
    const data = (res as any).body.singleResult.data;
    expect(data.deleteContent).toBe(true);
    // Check Neo4j for deleted nodes and relationships
    expect(neo4jSessionMock.run).toHaveBeenCalled();
  });

  // User Management Tests
  describe('User Management', () => {
    // Mutation - login
    it('should successfully login with valid Firebase token', async () => {
      const mockUser = {
        userid: 'user-123',
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        firebaseuid: 'firebase-uid-123',
        createdat: new Date(),
        updatedat: new Date()
      };
      
      // Mock Firebase token verification
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'firebase-uid-123',
        email: 'john@example.com'
      });
      
      // Mock user lookup by firebaseUid
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [mockUser] });
      
      const res = await server.executeOperation({
        query: `mutation($idToken: String!) { 
          login(idToken: $idToken) { 
            user { userId firstName lastName email firebaseUid createdAt } 
            token 
          } 
        }`,
        variables: { idToken: 'valid-firebase-token' }
      });
      
      const data = (res as any).body.singleResult.data;
      expect(data.login.user).toMatchObject({
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        firebaseUid: 'firebase-uid-123'
      });
      expect(data.login.token).toBeDefined();
      expect(typeof data.login.token).toBe('string');
    });

    it('should return error for invalid Firebase token', async () => {
      // Mock Firebase token verification failure
      mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));
      
      const res = await server.executeOperation({
        query: `mutation($idToken: String!) { 
          login(idToken: $idToken) { 
            user { userId } 
            token 
          } 
        }`,
        variables: { idToken: 'invalid-firebase-token' }
      });
      
      const errors = (res as any).body?.singleResult?.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0].message).toMatch('Invalid Firebase ID token');
    });

    it('should return error when user does not exist in database', async () => {
      // Mock Firebase token verification success
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'firebase-uid-999',
        email: 'nonexistent@example.com'
      });
      
      // Mock user not found
      mockPgQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      
      const res = await server.executeOperation({
        query: `mutation($idToken: String!) { 
          login(idToken: $idToken) { 
            user { userId } 
            token 
          } 
        }`,
        variables: { idToken: 'valid-firebase-token' }
      });
      
      const errors = (res as any).body?.singleResult?.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0].message).toMatch('User not found. Please create an account first.');
    });

    // Mutation - createUser
    it('should successfully create a new user', async () => {
      const mockUser = {
        userid: 'new-user-123',
        firstname: 'Jane',
        lastname: 'Smith',
        email: 'jane@example.com',
        firebaseuid: 'firebase-uid-456',
        createdat: new Date(),
        updatedat: new Date()
      };
      
      // Mock Firebase token verification
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'firebase-uid-456',
        email: 'jane@example.com'
      });
      
      // Mock check for existing user by firebaseUid
      mockPgQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // Mock check for existing user by email
      mockPgQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // Mock user creation
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [mockUser] });
      
      const res = await server.executeOperation({
        query: `mutation($idToken: String!, $firstName: String!, $lastName: String!) { 
          createUser(idToken: $idToken, firstName: $firstName, lastName: $lastName) { 
            user { userId firstName lastName email firebaseUid createdAt } 
            token 
          } 
        }`,
        variables: { 
          idToken: 'valid-firebase-token',
          firstName: 'Jane', 
          lastName: 'Smith'
        }
      });
      
      const data = (res as any).body.singleResult.data;
      expect(data.createUser.user).toMatchObject({
        userId: 'new-user-123',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        firebaseUid: 'firebase-uid-456'
      });
      expect(data.createUser.token).toBeDefined();
    });

    it('should return error when creating user with existing Firebase UID', async () => {
      // Mock Firebase token verification
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'firebase-uid-existing',
        email: 'existing@example.com'
      });
      
      // Mock user already exists by firebaseUid
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ firebaseuid: 'firebase-uid-existing' }] });
      
      const res = await server.executeOperation({
        query: `mutation($idToken: String!, $firstName: String!, $lastName: String!) { 
          createUser(idToken: $idToken, firstName: $firstName, lastName: $lastName) { 
            user { userId } 
            token 
          } 
        }`,
        variables: { 
          idToken: 'valid-firebase-token',
          firstName: 'John', 
          lastName: 'Doe'
        }
      });
      
      const errors = (res as any).body?.singleResult?.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0].message).toMatch('User with this Firebase UID already exists');
    });

    it('should return error when creating user with existing email', async () => {
      // Mock Firebase token verification
      mockVerifyIdToken.mockResolvedValueOnce({
        uid: 'firebase-uid-new',
        email: 'existing@example.com'
      });
      
      // Mock user doesn't exist by firebaseUid
      mockPgQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // Mock user already exists by email
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ email: 'existing@example.com' }] });
      
      const res = await server.executeOperation({
        query: `mutation($idToken: String!, $firstName: String!, $lastName: String!) { 
          createUser(idToken: $idToken, firstName: $firstName, lastName: $lastName) { 
            user { userId } 
            token 
          } 
        }`,
        variables: { 
          idToken: 'valid-firebase-token',
          firstName: 'John', 
          lastName: 'Doe'
        }
      });
      
      const errors = (res as any).body?.singleResult?.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0].message).toMatch('User with this email already exists');
    });

    // Query - getUser
    it('should return user when userId exists', async () => {
      const mockUser = {
        userid: 'user-123',
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        firebaseuid: 'firebase-uid-123',
        createdat: new Date(),
        updatedat: new Date()
      };
      
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [mockUser] });
      
      const res = await server.executeOperation({
        query: `query($userId: ID!) { 
          getUser(userId: $userId) { 
            userId firstName lastName email firebaseUid createdAt updatedAt 
          } 
        }`,
        variables: { userId: 'user-123' }
      });
      
      const data = (res as any).body.singleResult.data;
      expect(data.getUser).toMatchObject({
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        firebaseUid: 'firebase-uid-123'
      });
    });

    it('should return error when userId does not exist', async () => {
      mockPgQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      
      const res = await server.executeOperation({
        query: `query($userId: ID!) { 
          getUser(userId: $userId) { 
            userId firstName 
          } 
        }`,
        variables: { userId: 'nonexistent-user' }
      });
      
      const errors = (res as any).body?.singleResult?.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0].message).toMatch('User not found');
    });

    // Query - getUserByEmail
    it('should return user when email exists', async () => {
      const mockUser = {
        userid: 'user-123',
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        createdat: new Date(),
        updatedat: new Date()
      };
      
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [mockUser] });
      
      const res = await server.executeOperation({
        query: `query($email: String!) { 
          getUserByEmail(email: $email) { 
            userId firstName lastName email 
          } 
        }`,
        variables: { email: 'john@example.com' }
    });
      
      const data = (res as any).body.singleResult.data;
      expect(data.getUserByEmail).toMatchObject({
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      });
    });

    // Query - getAllUsers
    it('should return all users', async () => {
      const mockUsers = [
        {
          userid: 'user-1',
          firstname: 'John',
          lastname: 'Doe',
          email: 'john@example.com',
          createdat: new Date(),
          updatedat: new Date()
        },
        {
          userid: 'user-2',
          firstname: 'Jane',
          lastname: 'Smith',
          email: 'jane@example.com',
          createdat: new Date(),
          updatedat: new Date()
        }
      ];
      
      mockPgQuery.mockResolvedValueOnce({ rowCount: 2, rows: mockUsers });
      
      const res = await server.executeOperation({
        query: `query { 
          getAllUsers { 
            userId firstName lastName email createdAt 
          } 
        }`
    });
      
      const data = (res as any).body.singleResult.data;
      expect(data.getAllUsers).toHaveLength(2);
      expect(data.getAllUsers[0]).toMatchObject({
        userId: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      });
      expect(data.getAllUsers[1]).toMatchObject({
        userId: 'user-2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com'
      });
    });

    // Mutation - updateUser
    it('should successfully update user information', async () => {
      const updatedUser = {
        userid: 'user-123',
        firstname: 'Jane',
        lastname: 'Smith',
        email: 'jane.smith@example.com',
        createdat: new Date(),
        updatedat: new Date()
      };
      
      // Mock user exists
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ userid: 'user-123' }] });
      // Mock email not taken by another user
      mockPgQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // Mock update successful
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [updatedUser] });
      
      const res = await server.executeOperation({
        query: `mutation($userId: ID!, $firstName: String, $lastName: String, $email: String) { 
          updateUser(userId: $userId, firstName: $firstName, lastName: $lastName, email: $email) { 
            userId firstName lastName email updatedAt 
          } 
        }`,
        variables: { 
          userId: 'user-123',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com'
        }
    });
      
      const data = (res as any).body.singleResult.data;
      expect(data.updateUser).toMatchObject({
        userId: 'user-123',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com'
      });
    });

    it('should return error when email is already taken by another user', async () => {
      // Mock user exists
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ userid: 'user-123' }] });
      // Mock email taken by another user
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ userid: 'user-456' }] });
      
      const res = await server.executeOperation({
        query: `mutation($userId: ID!, $email: String) { 
          updateUser(userId: $userId, email: $email) { 
            userId email 
          } 
        }`,
        variables: { 
          userId: 'user-123',
          email: 'taken@example.com'
        }
      });
      
      const errors = (res as any).body?.singleResult?.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0].message).toMatch('Email is already taken by another user');
    });

    // Mutation - deleteUser
    it('should successfully delete user and return true', async () => {
      // Mock user exists
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ userid: 'user-123' }] });
      // Mock Neo4j deletion
      neo4jSessionMock.run.mockResolvedValueOnce({ records: [] });
      // Mock content deletion from Postgres
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      // Mock user deletion from Postgres
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      
      const res = await server.executeOperation({
        query: `mutation($userId: ID!) { 
          deleteUser(userId: $userId) 
        }`,
        variables: { userId: 'user-123' }
      });
      
      const data = (res as any).body.singleResult.data;
      expect(data.deleteUser).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      // Mock user doesn't exist
      mockPgQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      
      const res = await server.executeOperation({
        query: `mutation($userId: ID!) { 
          deleteUser(userId: $userId) 
        }`,
        variables: { userId: 'nonexistent-user' }
      });
      
      const data = (res as any).body.singleResult.data;
      expect(data.deleteUser).toBe(false);
    });
  });

  // Query - getContentByTag
  describe('Content by Tag Queries', () => {
    it('should return all content for a specific tag when user and tag exist', async () => {
      // Mock user exists
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ userid: 'user-123' }] });
      
      // Mock Neo4j to return content IDs for the tag
      neo4jSessionMock.run.mockResolvedValueOnce({
        records: [
          { get: () => 'content-1' },
          { get: () => 'content-2' }
        ]
      });
      
      // Mock Postgres to return content details
      mockPgQuery.mockResolvedValueOnce({
        rowCount: 2,
        rows: [
          {
            contentid: 'content-1',
            userid: 'user-123',
            title: 'First Article',
            type: 'article',
            created_at: new Date(),
            properties: { description: 'First article about software engineering' }
          },
          {
            contentid: 'content-2',
            userid: 'user-123',
            title: 'Second Article',
            type: 'article',
            created_at: new Date(),
            properties: { description: 'Second article about software engineering' }
          }
        ]
      });

      const res = await server.executeOperation({
        query: `query($userId: ID!, $tagName: String!) { 
          getContentByTag(userId: $userId, tagName: $tagName) { 
            contentId title type properties 
          } 
        }`,
        variables: { 
          userId: 'user-123',
          tagName: 'software engineering'
        }
    });
      
      const data = (res as any).body.singleResult.data;
      expect(data.getContentByTag).toHaveLength(2);
      expect(data.getContentByTag[0]).toMatchObject({
        contentId: 'content-1',
        title: 'First Article',
        type: 'article'
      });
      expect(data.getContentByTag[1]).toMatchObject({
        contentId: 'content-2',
        title: 'Second Article',
        type: 'article'
      });
    });

    it('should return empty array when tag has no content', async () => {
      // Mock user exists
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ userid: 'user-123' }] });
      
      // Mock Neo4j to return no content for the tag
      neo4jSessionMock.run.mockResolvedValueOnce({
        records: []
      });

      const res = await server.executeOperation({
        query: `query($userId: ID!, $tagName: String!) { 
          getContentByTag(userId: $userId, tagName: $tagName) { 
            contentId title 
          } 
        }`,
        variables: { 
          userId: 'user-123',
          tagName: 'nonexistent-tag'
        }
    });
      
      const data = (res as any).body.singleResult.data;
      expect(data.getContentByTag).toHaveLength(0);
    });

    it('should return error when user does not exist', async () => {
      // Mock user doesn't exist
      mockPgQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const res = await server.executeOperation({
        query: `query($userId: ID!, $tagName: String!) { 
          getContentByTag(userId: $userId, tagName: $tagName) { 
            contentId title 
          } 
        }`,
        variables: { 
          userId: 'nonexistent-user',
          tagName: 'software engineering'
        }
    });
      
      const errors = (res as any).body?.singleResult?.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0].message).toMatch('User not found');
    });

    it('should return empty array when tag does not exist', async () => {
      // Mock user exists
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ userid: 'user-123' }] });
      
      // Mock Neo4j to return no content for the non-existent tag
      neo4jSessionMock.run.mockResolvedValueOnce({
        records: []
      });

      const res = await server.executeOperation({
        query: `query($userId: ID!, $tagName: String!) { 
          getContentByTag(userId: $userId, tagName: $tagName) { 
            contentId title 
          } 
        }`,
        variables: { 
          userId: 'user-123',
          tagName: 'nonexistent-tag'
        }
    });
      
      const data = (res as any).body.singleResult.data;
      expect(data.getContentByTag).toHaveLength(0);
    });
  });

  // Mutation - updateContent
  describe('Content Updates', () => {
    it('should successfully update content title', async () => {
      const mockContent = {
        contentid: 'content-1',
        userid: 'user-123',
        title: 'Original Title',
        type: 'article',
        created_at: new Date(),
        properties: { description: 'Original description' }
      };
      
      // Mock content exists
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [mockContent] });
      
      // Mock update successful
      mockPgQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          ...mockContent,
          title: 'Updated Title'
        }]
      });

      const res = await server.executeOperation({
        query: `mutation($contentId: ID!, $title: String) { 
          updateContent(contentId: $contentId, title: $title) { 
            contentId title type properties 
          } 
        }`,
        variables: { 
          contentId: 'content-1',
          title: 'Updated Title'
        }
    });
      
      const data = (res as any).body.singleResult.data;
      expect(data.updateContent).toMatchObject({
        contentId: 'content-1',
        title: 'Updated Title',
        type: 'article'
      });
    });

    it('should successfully update content type and properties', async () => {
      const mockContent = {
        contentid: 'content-1',
        userid: 'user-123',
        title: 'Test Content',
        type: 'article',
        created_at: new Date(),
        properties: { description: 'Original description' }
      };
      
      // Mock content exists
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [mockContent] });
      
      // Mock update successful
      mockPgQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{
          ...mockContent,
          type: 'tutorial',
          properties: { description: 'Updated description', difficulty: 'intermediate' }
        }]
      });

      const res = await server.executeOperation({
        query: `mutation($contentId: ID!, $type: String, $properties: JSON) { 
          updateContent(contentId: $contentId, type: $type, properties: $properties) { 
            contentId title type properties 
          } 
        }`,
        variables: { 
          contentId: 'content-1',
          type: 'tutorial',
          properties: { description: 'Updated description', difficulty: 'intermediate' }
        }
    });
      
      const data = (res as any).body.singleResult.data;
      expect(data.updateContent).toMatchObject({
        contentId: 'content-1',
        title: 'Test Content',
        type: 'tutorial',
        properties: { description: 'Updated description', difficulty: 'intermediate' }
      });
    });

    it('should return existing content when no updates provided', async () => {
      const mockContent = {
        contentid: 'content-1',
        userid: 'user-123',
        title: 'Test Content',
        type: 'article',
        created_at: new Date(),
        properties: { description: 'Test description' }
      };
      
      // Mock content exists
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [mockContent] });

      const res = await server.executeOperation({
        query: `mutation($contentId: ID!) { 
          updateContent(contentId: $contentId) { 
            contentId title type properties 
          } 
        }`,
        variables: { 
          contentId: 'content-1'
        }
    });
      
      const data = (res as any).body.singleResult.data;
      expect(data.updateContent).toMatchObject({
        contentId: 'content-1',
        title: 'Test Content',
        type: 'article',
        properties: { description: 'Test description' }
      });
    });

    it('should return error when content does not exist', async () => {
      // Mock content doesn't exist
      mockPgQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const res = await server.executeOperation({
        query: `mutation($contentId: ID!, $title: String) { 
          updateContent(contentId: $contentId, title: $title) { 
            contentId title 
          } 
        }`,
        variables: { 
          contentId: 'nonexistent-content',
          title: 'Updated Title'
        }
    });
      
      const errors = (res as any).body?.singleResult?.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0].message).toMatch('Content not found');
    });
  });
});