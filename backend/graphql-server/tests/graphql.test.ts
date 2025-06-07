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

const mockPgQuery = pgPool.query as jest.Mock;

// Mocking the modules
jest.mock('pg');
jest.mock('neo4j-driver');

const MOCK_LLM_RESPONSE = ["software engineering", "databases", "system design"];

describe('GraphQL Resolvers', () => {
  let server: ApolloServer;
  let neo4jSessionMock: any;

  beforeAll(() => {
    server = new ApolloServer({ typeDefs, resolvers });
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
      // First call: nodes (tags and content)
      .mockResolvedValueOnce({
        records: [
          { get: (key: string) => key === 'n' ? { identity: 'tag1', properties: {} } : undefined },
          { get: (key: string) => key === 'n' ? { identity: 'content1', properties: {} } : undefined }
        ]
      })
      // Second call: edges (relationships)
      .mockResolvedValueOnce({
        records: [
          { get: (key: string) => key === 'r' ? { start: { toString: () => 'tag1' }, end: { toString: () => 'content1' }, type: 'TAGGED' } : undefined }
        ]
      });

    const res = await server.executeOperation({
      query: `query($userId: ID!) { get_user_graph(userId: $userId) { nodes { id } edges { from to } } }`,
      variables: { userId: '1' }
    });
    const errors = (res as any).body.singleResult.errors;
    if (errors) {
      console.log('GraphQL error:', errors[0].message);
    }
    const data = (res as any).body.singleResult.data;
    expect(data.get_user_graph).not.toBeNull();
    expect(Array.isArray(data.get_user_graph.nodes)).toBe(true);
    expect(data.get_user_graph.nodes.length).toBe(2);
    expect(Array.isArray(data.get_user_graph.edges)).toBe(true);
    expect(data.get_user_graph.edges.length).toBe(1);
    expect(data.get_user_graph.nodes.map((n: any) => n.id)).toEqual(expect.arrayContaining(['tag_tag1', 'content_content1']));
    expect(data.get_user_graph.edges[0]).toMatchObject({ from: 'tag_tag1', to: 'content_content1' });
  });

  // Mutation - addContent
  it('should successfully add content and create tags/relationships in Neo4j when userId exists', async () => {
    // Mock Postgres and Neo4j responses
    mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ userId: '1' }] });
    neo4jSessionMock.run.mockResolvedValueOnce({ records: [{ get: () => '1' }] });

    const res = await server.executeOperation({
      query: `mutation($userId: ID!, $title: String!) { addContent(userId: $userId, title: $title) { contentId title } }`,
      variables: { userId: '1', title: 'New Content' }
    });
    const data = (res as any).body.singleResult.data;
    expect(data.addContent.title).toBe('New Content');
    // Check Neo4j for created nodes and relationships
    expect(neo4jSessionMock.run).toHaveBeenCalled();
  });

  it('should throw an error if userId does not exist in Postgres', async () => {
    const res = await server.executeOperation({
      query: `mutation($userId: ID!, $title: String!) { addContent(userId: $userId, title: $title) { contentId title } }`,
      variables: { userId: 'nonexistent-user', title: 'New Content' }
    });
    const errors = (res as any).body?.singleResult?.errors;
    expect(errors).toBeDefined();
    expect(errors?.[0].message).toMatch(/User not found/);
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
    mockPgQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ contentId: '1' }] });
    const res = await server.executeOperation({
      query: `mutation($contentId: ID!) { deleteContent(contentId: $contentId) }`,
      variables: { contentId: '1' }
    });
    const data = (res as any).body.singleResult.data;
    expect(data.deleteContent).toBe(true);
    // Check Neo4j for deleted nodes and relationships
    expect(neo4jSessionMock.run).toHaveBeenCalled();
  });
});