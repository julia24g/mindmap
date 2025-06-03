import { ApolloServer } from '@apollo/server';
import { resolvers } from '../src/resolvers';
import { typeDefs } from '../src/schema';
import nock from 'nock';
import { Pool } from 'pg';
import neo4j from 'neo4j-driver';

// Mocking the modules
jest.mock('pg');
jest.mock('neo4j-driver');

const MOCK_LLM_RESPONSE = ["software engineering", "databases", "system design"];

const setupDbMocks = (pgPoolMock: any, neo4jSessionMock: any) => {
  // ...mock implementation for Postgres and Neo4j...
};

describe('GraphQL Resolvers', () => {
  let server: ApolloServer;
  let pgPoolMock: any;
  let neo4jSessionMock: any;

  beforeAll(() => {
    server = new ApolloServer({ typeDefs, resolvers });
  });

  beforeEach(() => {
    jest.resetAllMocks();
    // Mock database connection methods
    pgPoolMock = {
      query: jest.fn()
    };
    (Pool as any).mockImplementation(() => pgPoolMock);
    neo4jSessionMock = {
      run: jest.fn(),
      close: jest.fn()
    };
    (neo4j.driver as any).mockReturnValue({ session: () => neo4jSessionMock });

    // Mock HTTP request to LLM service
    nock('http://localhost:8000')
      .post('/suggest-tags')
      .reply(200, { suggested_tags: MOCK_LLM_RESPONSE });

    // Insert test data for Postgres and Neo4j
    // ...simulate insertions by setting up mock return values...
  });

  afterEach(() => {
    nock.cleanAll();
    // ...clear mock data if needed...
  });

  // Query - content
  it('should return error when contentId does not exist in Postgres', async () => {
    pgPoolMock.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await server.executeOperation({
      query: `query($contentId: ID!) { content(contentId: $contentId) { title } }`,
      variables: { contentId: '999' }
    });
    expect(res.errors).toBeDefined();
    expect(res.errors![0].message).toMatch(/Content not found/);
  });

  it('should return the correct content object when contentId exists', async () => {
    pgPoolMock.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ contentid: '1', title: 'Test Content' }] });
    const res = await server.executeOperation({
      query: `query($contentId: ID!) { content(contentId: $contentId) { title } }`,
      variables: { contentId: '1' }
    });
    expect(res.errors).toBeUndefined();
    expect(res.data.content.title).toBe('Test Content');
  });

  // Query - get_user_graph
  it('should return an empty graph when userId does not exist in Neo4j/Postgres', async () => {
    // Mock Postgres and Neo4j responses
    pgPoolMock.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    neo4jSessionMock.run.mockResolvedValueOnce({ records: [] });

    const res = await server.executeOperation({
      query: `query($userId: ID!) { get_user_graph(userId: $userId) { nodes { id } edges { from to } } }`,
      variables: { userId: 'nonexistent-user' }
    });

    expect(res.errors).toBeUndefined();
    expect(res.data.get_user_graph.nodes).toHaveLength(0);
    expect(res.data.get_user_graph.edges).toHaveLength(0);
  });

  it('should return all relevant nodes and edges for a userId that exists', async () => {
    // Mock Postgres and Neo4j responses
    pgPoolMock.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ userId: '1', firstName: 'TestUser' }] });
    neo4jSessionMock.run.mockResolvedValueOnce({
      records: [
        { get: (key: string) => (key === 'id' ? '1' : null) },
        { get: (key: string) => (key === 'id' ? '2' : null) }
      ]
    });

    const res = await server.executeOperation({
      query: `query($userId: ID!) { get_user_graph(userId: $userId) { nodes { id } edges { from to } } }`,
      variables: { userId: '1' }
    });

    expect(res.errors).toBeUndefined();
    expect(res.data.get_user_graph.nodes).toHaveLength(2);
    expect(res.data.get_user_graph.edges).toHaveLength(1);
  });

  // Mutation - addContent
  it('should successfully add content and create tags/relationships in Neo4j when userId exists', async () => {
    // Mock Postgres and Neo4j responses
    pgPoolMock.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ userId: '1' }] });
    neo4jSessionMock.run.mockResolvedValueOnce({ records: [{ get: () => '1' }] });

    const res = await server.executeOperation({
      query: `mutation($userId: ID!, $title: String!) { addContent(userId: $userId, title: $title) { contentId title } }`,
      variables: { userId: '1', title: 'New Content' }
    });

    expect(res.errors).toBeUndefined();
    expect(res.data.addContent.title).toBe('New Content');
    // Check Neo4j for created nodes and relationships
    expect(neo4jSessionMock.run).toHaveBeenCalled();
  });

  it('should throw an error if userId does not exist in Postgres', async () => {
    const res = await server.executeOperation({
      query: `mutation($userId: ID!, $title: String!) { addContent(userId: $userId, title: $title) { contentId title } }`,
      variables: { userId: 'nonexistent-user', title: 'New Content' }
    });

    expect(res.errors).toBeDefined();
    expect(res.errors![0].message).toMatch(/User not found/);
  });

  // Mutation - deleteContent
  it('should return false if contentId does not exist in Postgres/Neo4j', async () => {
    pgPoolMock.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await server.executeOperation({
      query: `mutation($contentId: ID!) { deleteContent(contentId: $contentId) }`,
      variables: { contentId: '999' }
    });
    expect(res.data.deleteContent).toBe(false);
  });

  it('should delete the content from both Postgres and Neo4j and return true when contentId exists', async () => {
    pgPoolMock.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ contentId: '1' }] });
    const res = await server.executeOperation({
      query: `mutation($contentId: ID!) { deleteContent(contentId: $contentId) }`,
      variables: { contentId: '1' }
    });
    expect(res.data.deleteContent).toBe(true);
    // Check Neo4j for deleted nodes and relationships
    expect(neo4jSessionMock.run).toHaveBeenCalled();
  });
});