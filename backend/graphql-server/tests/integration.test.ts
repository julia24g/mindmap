import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Neo4jContainer } from '@testcontainers/neo4j';
import axios from 'axios';
import nock from 'nock';

describe('Integration Tests', () => {
  let server: ApolloServer | undefined;
  let url: string;

  let pgContainer: any;
  let neo4jContainer: any;

  let pgPool: any;
  let neo4jDriver: any;
  let getAuthContext: any;
  let typeDefs: any;
  let resolvers: any;

  beforeAll(async () => {
    jest.setTimeout(120_000);
    pgContainer = await new PostgreSqlContainer('postgres:15')
      .withDatabase('testdb')
      .withUsername('testuser')
      .withPassword('testpass')
      .start();

    neo4jContainer = await new Neo4jContainer('neo4j:5')
      .withPassword('testpass')
      .start();

    process.env.PG_HOST = pgContainer.getHost();
    process.env.PG_PORT = String(pgContainer.getPort());
    process.env.PG_USER = pgContainer.getUsername();
    process.env.PG_PASSWORD = pgContainer.getPassword();
    process.env.PG_DATABASE = pgContainer.getDatabase();

    const boltUri = neo4jContainer.getBoltUri().replace(/\/$/, '');
    process.env.NEO4J_URI = boltUri;
    process.env.NEO4J_USER = neo4jContainer.getUsername();
    process.env.NEO4J_PASSWORD = neo4jContainer.getPassword();

    ({ typeDefs } = await import('../src/schema'));
    ({ resolvers } = await import('../src/resolvers'));
    ({ getAuthContext } = await import('../src/auth'));

    ({ pgPool } = await import('../src/db/postgres'));
    ({ neo4jDriver } = await import('../src/db/neo4j'));

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const sqlPath = path.join(__dirname, '..', '..', '..', 'database', 'postgres-init.sql');
      const sql = await fs.readFile(sqlPath, 'utf8');
      await pgPool.query(sql);
    } catch (e) {
      console.error('Failed to run init SQL:', e);
      throw e;
    }

    server = new ApolloServer({
      typeDefs,
      resolvers,
      formatError: (error) => {
        console.error('GraphQL Error:', error);
        return {
          message: error.message,
          path: error.path,
          extensions: error.extensions,
        };
      },
    });

    const started = await startStandaloneServer(server, {
      listen: { port: 4001 },
      context: async ({ req }) => {
        const authContext = getAuthContext(req.headers);
        return { ...authContext, headers: req.headers };
      },
    });

    url = started.url;
  }, 120_000);

  afterAll(async () => {
    try {
      await server?.stop();
    } catch (e) {
      // ignore
    }

    try {
      await pgPool?.end();
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
    if (pgPool) {
      await pgPool.query('DELETE FROM contents');
      await pgPool.query('DELETE FROM users');
    }

    if (neo4jDriver) {
      const session = neo4jDriver.session();
      try {
        await session.run('MATCH (n) DETACH DELETE n');
      } finally {
        await session.close();
      }
    }
  }

  describe('Content Management Flow', () => {

    async function postGraphQL(payload: any) {
      const resp = await axios.post(url, payload);
      if (resp.data?.errors) {
        throw new Error(JSON.stringify(resp.data.errors, null, 2));
      }
      if (!resp.data || typeof resp.data !== 'object' || resp.data.data === undefined) {
        throw new Error(`Unexpected GraphQL response: ${JSON.stringify(resp.data, null, 2)}`);
      }
      return resp;
    }

    it('should retrieve user graph with nodes and edges', async () => {
    const llmScope = nock('http://localhost:8000')
      .persist()
      .post('/suggest-tags')
      .reply(200, { suggested_tags: ['alpha', 'beta'] });

      const createUserMutation = `
        mutation CreateUser($firstName: String!, $lastName: String!, $email: String!, $password: String!) {
          createUser(firstName: $firstName, lastName: $lastName, email: $email, password: $password) {
            user { userId }
            token
          }
        }
      `;

      const email = `graph-test-${Date.now()}@example.com`;
      const createResp = await postGraphQL({
        query: createUserMutation,
        variables: { firstName: 'Graph', lastName: 'User', email, password: 'passw0rd' },
      });
      const userId = createResp.data.data.createUser.user.userId;

      const addContentMutation = `
        mutation AddContent($userId: ID!, $title: String!, $type: String, $properties: JSON) {
          addContent(userId: $userId, title: $title, type: $type, properties: $properties) {
            contentId
          }
        }
      `;

        const addResp1 = await postGraphQL({ query: addContentMutation, variables: { userId, title: 'First', type: 'note', properties: { description: 'd1' } } });
        const contentId1 = addResp1.data.data.addContent.contentId;

        const addResp2 = await postGraphQL({ query: addContentMutation, variables: { userId, title: 'Second', type: 'note', properties: { description: 'd2' } } });
        const contentId2 = addResp2.data.data.addContent.contentId;

      const getGraphQuery = `
        query GetUserGraph($userId: ID!) {
          get_user_graph(userId: $userId) {
            nodes { id label contentId name }
            edges { from to type }
          }
        }
      `;

      const graphResp = await axios.post(url, { query: getGraphQuery, variables: { userId } });
      const graph = graphResp.data.data.get_user_graph;
      expect(graph).toBeDefined();
      expect(Array.isArray(graph.nodes)).toBe(true);
      expect(Array.isArray(graph.edges)).toBe(true);

        const tagNodes = graph.nodes.filter((n: any) => n.label === 'Tag');
        const contentNodes = graph.nodes.filter((n: any) => n.label === 'Content');
        expect(tagNodes.length).toBeGreaterThanOrEqual(1);
        expect(contentNodes.length).toBeGreaterThanOrEqual(2);

        // Tags should include the LLM-suggested tags
        const tagNames = tagNodes.map((t: any) => t.name).filter(Boolean);
        expect(tagNames).toEqual(expect.arrayContaining(['alpha', 'beta']));

        // Content nodes should include the two contentIds returned from the mutation
        const returnedContentIds = contentNodes.map((c: any) => c.contentId).filter(Boolean);
        expect(returnedContentIds).toEqual(expect.arrayContaining([contentId1, contentId2]));

        // Build a map of nodes by id for easier edge validation
        const nodesById = new Map(graph.nodes.map((n: any) => [n.id, n]));

        // DESCRIBES edges should connect Tag -> Content
        const describesEdges = graph.edges.filter((e: any) => e.type === 'DESCRIBES');
        expect(describesEdges.length).toBeGreaterThanOrEqual(2);

        describesEdges.forEach((e: any) => {
          const from = nodesById.get(e.from) as any;
          const to = nodesById.get(e.to) as any;
          // from should be a Tag node, to should be a Content node
          expect(from).toBeDefined();
          expect(to).toBeDefined();
          expect(from.label).toBe('Tag');
          expect(to.label).toBe('Content');
          // The content node referenced by the edge should have a contentId matching one we created
          expect([contentId1, contentId2]).toContain(to.contentId);
        });

  nock.cleanAll();
    });
  });
});
