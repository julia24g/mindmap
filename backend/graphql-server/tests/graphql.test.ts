jest.mock('../src/db/postgres', () => ({
  pgPool: { query: jest.fn() }
}));
jest.mock('../src/db/neo4j', () => ({
  neo4jDriver: { session: jest.fn() }
}));

import { ApolloServer } from '@apollo/server';
import { resolvers } from '../src/resolvers';
import { typeDefs } from '../src/schema';
import nock from 'nock';
import { pgPool } from '../src/db/postgres';
import { neo4jDriver } from '../src/db/neo4j';
import { AuthContext } from '../src/auth';

const mockPgQuery = pgPool.query as jest.Mock;

// Mocking the modules
jest.mock('pg');
jest.mock('neo4j-driver');

const MOCK_LLM_RESPONSE = ["software engineering", "databases", "system design"];

describe('GraphQL Resolvers', () => {
  let server: ApolloServer<AuthContext>;
  let neo4jSessionMock: any;

  beforeAll(() => {
    server = new ApolloServer<AuthContext>({ 
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
    mockPgQuery.mockImplementation(() => ({ rowCount: 0, rows: [] }));
    const res = await server.executeOperation({
      query: `query($contentId: ID!) { content(contentId: $contentId) { title } }`,
      variables: { contentId: '999' }
    }, {
      contextValue: { isAuthenticated: false }
    });
    const errors = (res as any).body?.singleResult?.errors;
    expect(errors).toBeDefined();
    expect(errors?.[0].message).toMatch(/Content not found/);
  });

  it('should return the correct content object when contentId exists', async () => {
    mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ contentid: '1', title: 'Test Content' }] });
    const res = await server.executeOperation({
      query: `query($contentId: ID!) { content(contentId: $contentId) { title } }`,
      variables: { contentId: '1' }
    }, {
      contextValue: { isAuthenticated: false }
    });
    const data = (res as any).body.singleResult.data;
    expect(data.content.title).toBe('Test Content');
  });

  // Query - get_user_graph
  it('should return an error when userId does not exist in Neo4j/Postgres', async () => {
    // Mock Postgres to return no user
    mockPgQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    neo4jSessionMock.run.mockResolvedValueOnce({ records: [] });

    const res = await server.executeOperation({
      query: `query($userId: ID!) { get_user_graph(userId: $userId) { nodes { id } edges { from to } } }`,
      variables: { userId: 'nonexistent-user' }
    }, {
      contextValue: { isAuthenticated: false }
    });
    const errors = (res as any).body?.singleResult?.errors;
    expect(errors).toBeDefined();
    expect(errors?.[0].message).toMatch(/User not found/);
  });

  it('should return all relevant nodes and edges for a userId that exists', async () => {
    // Mock Postgres to return a user
    mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ userId: '1', firstName: 'TestUser' }] });
    
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
                  properties: { title: 'Test Content' }
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
      query: `query($userId: ID!) { get_user_graph(userId: $userId) { nodes { id label contentId name } edges { from to type } } }`,
      variables: { userId: '1' }
    }, {
      contextValue: { isAuthenticated: false }
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
      label: 'Tag',
      name: 'software engineering',
      contentId: null  // Tag nodes have no contentId
    });
    
    const contentNode = data.get_user_graph.nodes.find((n: any) => n.id === 'content_content1');
    expect(contentNode).toMatchObject({ 
      label: 'Content',
      contentId: 'content1',  // Content nodes have contentId
      name: null  // Content nodes have no name
    });
  });

  // Mutation - addContent
  it('should successfully add content and create tags/relationships in Neo4j when userId exists', async () => {
    // Mock Postgres responses for both queries
    // First call: Check if user exists
    mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ userId: '1' }] });
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
      query: `mutation($userId: ID!, $title: String!) { addContent(userId: $userId, title: $title) { contentId title } }`,
      variables: { userId: '1', title: 'New Content' }
    }, {
      contextValue: { isAuthenticated: false }
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
      query: `mutation($userId: ID!, $title: String!) { addContent(userId: $userId, title: $title) { contentId title } }`,
      variables: { userId: 'nonexistent-user', title: 'New Content' }
    }, {
      contextValue: { isAuthenticated: false }
    });
    const errors = (res as any).body?.singleResult?.errors;
    expect(errors).toBeDefined();
    expect(errors?.[0].message).toMatch('User does not exist');
  });

  // Mutation - deleteContent
  it('should return false if contentId does not exist in Postgres/Neo4j', async () => {
    mockPgQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await server.executeOperation({
      query: `mutation($contentId: ID!) { deleteContent(contentId: $contentId) }`,
      variables: { contentId: '999' }
    }, {
      contextValue: { isAuthenticated: false }
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
    }, {
      contextValue: { isAuthenticated: false }
    });
    const data = (res as any).body.singleResult.data;
    expect(data.deleteContent).toBe(true);
    // Check Neo4j for deleted nodes and relationships
    expect(neo4jSessionMock.run).toHaveBeenCalled();
  });

  // User Management Tests
  describe('User Management', () => {
    // Query - login
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        userid: 'user-123',
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        passwordhash: '$2b$10$hashedpassword',
        createdat: new Date(),
        updatedat: new Date()
      };
      
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [mockUser] });
      
      // Mock bcrypt.compare to return true for valid password
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      
      const res = await server.executeOperation({
        query: `mutation($email: String!, $password: String!) { 
          login(email: $email, password: $password) { 
            user { userId firstName lastName email createdAt } 
            token 
          } 
        }`,
        variables: { email: 'john@example.com', password: 'password123' }
      }, {
        contextValue: { isAuthenticated: false }
      });
      
      const data = (res as any).body.singleResult.data;
      expect(data.login.user).toMatchObject({
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      });
      expect(data.login.token).toBeDefined();
      expect(typeof data.login.token).toBe('string');
    });

    it('should return error for invalid email', async () => {
      mockPgQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      
      const res = await server.executeOperation({
        query: `mutation($email: String!, $password: String!) { 
          login(email: $email, password: $password) { 
            user { userId } 
            token 
          } 
        }`,
        variables: { email: 'nonexistent@example.com', password: 'password123' }
      }, {
        contextValue: { isAuthenticated: false }
      });
      
      const errors = (res as any).body?.singleResult?.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0].message).toMatch('Invalid email or password');
    });

    it('should return error for invalid password', async () => {
      const mockUser = {
        userid: 'user-123',
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com',
        passwordhash: '$2b$10$hashedpassword',
        createdat: new Date(),
        updatedat: new Date()
      };
      
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [mockUser] });
      
      // Mock bcrypt.compare to return false for invalid password
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
      
      const res = await server.executeOperation({
        query: `mutation($email: String!, $password: String!) { 
          login(email: $email, password: $password) { 
            user { userId } 
            token 
          } 
        }`,
        variables: { email: 'john@example.com', password: 'wrongpassword' }
      }, {
        contextValue: { isAuthenticated: false }
      });
      
      const errors = (res as any).body?.singleResult?.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0].message).toMatch('Invalid email or password');
    });

    // Mutation - createUser
    it('should successfully create a new user', async () => {
      const mockUser = {
        userid: 'new-user-123',
        firstname: 'Jane',
        lastname: 'Smith',
        email: 'jane@example.com',
        createdat: new Date(),
        updatedat: new Date()
      };
      
      // Mock user doesn't exist
      mockPgQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      // Mock user creation
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [mockUser] });
      
      // Mock bcrypt.hash
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2b$10$hashedpassword');
      
      const res = await server.executeOperation({
        query: `mutation($firstName: String!, $lastName: String!, $email: String!, $password: String!) { 
          createUser(firstName: $firstName, lastName: $lastName, email: $email, password: $password) { 
            user { userId firstName lastName email createdAt } 
            token 
          } 
        }`,
        variables: { 
          firstName: 'Jane', 
          lastName: 'Smith', 
          email: 'jane@example.com', 
          password: 'password123' 
        }
      }, {
        contextValue: { isAuthenticated: false }
      });
      
      const data = (res as any).body.singleResult.data;
      expect(data.createUser.user).toMatchObject({
        userId: 'new-user-123',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com'
      });
      expect(data.createUser.token).toBeDefined();
    });

    it('should return error when creating user with existing email', async () => {
      // Mock user already exists
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ email: 'existing@example.com' }] });
      
      const res = await server.executeOperation({
        query: `mutation($firstName: String!, $lastName: String!, $email: String!, $password: String!) { 
          createUser(firstName: $firstName, lastName: $lastName, email: $email, password: $password) { 
            user { userId } 
            token 
          } 
        }`,
        variables: { 
          firstName: 'John', 
          lastName: 'Doe', 
          email: 'existing@example.com', 
          password: 'password123' 
        }
      }, {
        contextValue: { isAuthenticated: false }
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
        createdat: new Date(),
        updatedat: new Date()
      };
      
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [mockUser] });
      
      const res = await server.executeOperation({
        query: `query($userId: ID!) { 
          getUser(userId: $userId) { 
            userId firstName lastName email createdAt updatedAt 
          } 
        }`,
        variables: { userId: 'user-123' }
      }, {
        contextValue: { isAuthenticated: true, userId: 'user-123', email: 'john@example.com' }
      });
      
      const data = (res as any).body.singleResult.data;
      expect(data.getUser).toMatchObject({
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      });
    });

    it('should return error when getUser is called without authentication', async () => {
      const res = await server.executeOperation({
        query: `query($userId: ID!) { 
          getUser(userId: $userId) { 
            userId firstName 
          } 
        }`,
        variables: { userId: 'user-123' }
      }, {
        contextValue: { isAuthenticated: false }
      });
      
      const errors = (res as any).body?.singleResult?.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0].message).toMatch('Authentication required');
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
      }, {
        contextValue: { isAuthenticated: true, userId: 'user-123', email: 'john@example.com' }
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
      }, {
        contextValue: { isAuthenticated: false }
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
      }, {
        contextValue: { isAuthenticated: false }
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
      }, {
        contextValue: { isAuthenticated: true, userId: 'user-123', email: 'john@example.com' }
      });
      
      const data = (res as any).body.singleResult.data;
      expect(data.updateUser).toMatchObject({
        userId: 'user-123',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com'
      });
    });

    it('should return error when updating user without authentication', async () => {
      const res = await server.executeOperation({
        query: `mutation($userId: ID!, $firstName: String) { 
          updateUser(userId: $userId, firstName: $firstName) { 
            userId firstName 
          } 
        }`,
        variables: { 
          userId: 'user-123',
          firstName: 'Jane'
        }
      }, {
        contextValue: { isAuthenticated: false }
      });
      
      const errors = (res as any).body?.singleResult?.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0].message).toMatch('Authentication required');
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
      }, {
        contextValue: { isAuthenticated: true, userId: 'user-123', email: 'john@example.com' }
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
      }, {
        contextValue: { isAuthenticated: true, userId: 'user-123', email: 'john@example.com' }
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
      }, {
        contextValue: { isAuthenticated: true, userId: 'user-123', email: 'john@example.com' }
      });
      
      const data = (res as any).body.singleResult.data;
      expect(data.deleteUser).toBe(false);
    });

    it('should return error when deleting user without authentication', async () => {
      const res = await server.executeOperation({
        query: `mutation($userId: ID!) { 
          deleteUser(userId: $userId) 
        }`,
        variables: { userId: 'user-123' }
      }, {
        contextValue: { isAuthenticated: false }
      });
      
      const errors = (res as any).body?.singleResult?.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0].message).toMatch('Authentication required');
    });

    // Mutation - changePassword
    it('should successfully change password', async () => {
      const mockUser = {
        passwordhash: '$2b$10$oldhashedpassword'
      };
      
      // Mock user exists
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [mockUser] });
      // Mock password update
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });
      
      // Mock bcrypt.compare to return true for current password
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2b$10$newhashedpassword');
      
      const res = await server.executeOperation({
        query: `mutation($userId: ID!, $currentPassword: String!, $newPassword: String!) { 
          changePassword(userId: $userId, currentPassword: $currentPassword, newPassword: $newPassword) 
        }`,
        variables: { 
          userId: 'user-123',
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123'
        }
      }, {
        contextValue: { isAuthenticated: true, userId: 'user-123', email: 'john@example.com' }
      });
      
      const data = (res as any).body.singleResult.data;
      expect(data.changePassword).toBe(true);
    });

    it('should return error when current password is incorrect', async () => {
      const mockUser = {
        passwordhash: '$2b$10$oldhashedpassword'
      };
      
      // Mock user exists
      mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [mockUser] });
      
      // Mock bcrypt.compare to return false for incorrect password
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
      
      const res = await server.executeOperation({
        query: `mutation($userId: ID!, $currentPassword: String!, $newPassword: String!) { 
          changePassword(userId: $userId, currentPassword: $currentPassword, newPassword: $newPassword) 
        }`,
        variables: { 
          userId: 'user-123',
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        }
      }, {
        contextValue: { isAuthenticated: true, userId: 'user-123', email: 'john@example.com' }
      });
      
      const errors = (res as any).body?.singleResult?.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0].message).toMatch('Current password is incorrect');
    });

    it('should return error when changing password without authentication', async () => {
      const res = await server.executeOperation({
        query: `mutation($userId: ID!, $currentPassword: String!, $newPassword: String!) { 
          changePassword(userId: $userId, currentPassword: $currentPassword, newPassword: $newPassword) 
        }`,
        variables: { 
          userId: 'user-123',
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123'
        }
      }, {
        contextValue: { isAuthenticated: false }
      });
      
      const errors = (res as any).body?.singleResult?.errors;
      expect(errors).toBeDefined();
      expect(errors?.[0].message).toMatch('Authentication required');
    });
  });
});