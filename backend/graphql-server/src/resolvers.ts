import axios from 'axios';
import { GraphQLDateTime, GraphQLJSON } from 'graphql-scalars';
import { pgPool } from './db/postgres';
import { neo4jDriver } from './db/neo4j';
import { GraphQLError } from 'graphql';

export const resolvers = {
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,
  Query: {
    // Get all content information
    async content(_, { contentId }) {
      // Fetch content from Postgres
      const result = await pgPool.query('SELECT * FROM contents WHERE contentid = $1', [contentId]);
      if (!result.rows.length) {
        throw new GraphQLError('Content not found');
      }
      return result.rows[0];
    },
    // Get all nodes and edges in user knowledge graph
    async get_user_graph(_, { userId }) {
      // Check if user exists in Postgres
      const userResult = await pgPool.query('SELECT 1 FROM users WHERE userId = $1', [userId]);
      if (userResult.rowCount === 0) {
        throw new GraphQLError('User not found');
      }
      const session = neo4jDriver.session();
      try {
        const tag_to_content = await session.run(
          `
          MATCH (parent:Tag)-[subRel:HAS_SUBTAG {userId: $userId}]->(sub:Tag)
          MATCH (tag:Tag)-[:DESCRIBES]->(content:Content {userId: $userId})
          WITH COLLECT(DISTINCT sub) + COLLECT(DISTINCT parent) + COLLECT(DISTINCT tag) AS tags
          UNWIND tags AS t
          MATCH (t)-[:DESCRIBES]->(c:Content {userId: $userId})
          RETURN DISTINCT t, c
          `,
          { userId }
        );

        const tag_to_tag = await session.run(
          `
          MATCH (parent:Tag)-[r:HAS_SUBTAG {userId: $userId}]->(sub:Tag)
          RETURN COLLECT(DISTINCT r) AS subtagRels
          `,
          { userId }
        );

        const nodesMap = new Map<string, any>();
        const edges: any[] = [];

        tag_to_content.records.forEach(record => {
          const tag = record.get('t');
          const content = record.get('c');

          if (tag && !nodesMap.has(`tag_${tag.identity}`)) {
            nodesMap.set(`tag_${tag.identity}`,
              {
                id: `tag_${tag.identity}`,
                label: 'Tag',
                name: tag.properties.name
              }
            );
          }

          if (content && !nodesMap.has(`content_${content.identity}`)) {
            nodesMap.set(`content_${content.identity}`,
              {
                id: `content_${content.identity}`,
                label: 'Content',
                title: content.properties.title
              }
            );
          }

          if (tag && content) {
            edges.push({
              from: `tag_${tag.identity}`,
              to: `content_${content.identity}`,
              type: 'DESCRIBES'
            });
          }
        });

        // Safely handle empty tag_to_tag.records
        const subtagRels = tag_to_tag.records[0]?.get("subtagRels") || [];
        subtagRels.forEach((rel: any) => {
          edges.push({
            from: `tag_${rel.start}`,
            to: `tag_${rel.end}`,
            type: 'HAS_SUBTAG'
          });
        });

        return {
          nodes: Array.from(nodesMap.values()),
          edges
        };
      } finally {
        await session.close();
      }
    },
    // Get all tags from Neo4j
    async get_all_tags() {
      const session = neo4jDriver.session();
      try {
        const result = await session.run(
          'MATCH (t:Tag) RETURN t.name AS name ORDER BY t.popularity'
        );
        return result.records.map(record => record.get('name'));
      } finally {
        await session.close();
      }
    }
  },
  Mutation: {
    // Add new content, generate tags using LLM, insert into Postgres and Neo4j
    async addContent(_, { userId, title, type, properties }) {
      // 0. Ensure user exists in Postgres users table
      const userResult = await pgPool.query(
        'SELECT 1 FROM users WHERE userId = $1', [userId]
      );
      if (userResult.rowCount === 0) {
        throw new Error('User does not exist');
      }
      // 1. Insert content into Postgres
      const insertResult = await pgPool.query(
        'INSERT INTO contents (userId, title, type, properties) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, title, type, properties]
      );
      const content = insertResult.rows[0];
      const contentId = content.contentid;

      // 2. Call LLM service to generate tags
      let tags = [];
      try {
        const llmRes = await axios.post('http://localhost:8000/suggest-tags', {
          title,
          description: properties?.description || ''
        });
        tags = llmRes.data.suggested_tags;
      } catch (e) {
        console.error('LLM tag service error:', e);
      }

      // 3. For each tag, update/create in Neo4j
      const session = neo4jDriver.session();
      try {
        for (const tagName of tags) {
          // Check if tag exists
          const tagRes = await session.run(
            // Finds node with label Tag and name = tagName
            // If it exists, increment popularity, otherwise create it
            `
            MERGE (t:Tag {name: $tagName})
            ON CREATE SET t.popularity = 1
            ON MATCH SET t.popularity = t.popularity + 1
            RETURN t
          `,
            { tagName }
          );
          // Create Content node
          await session.run(
            `
            MERGE (c:Content {userId: $userId, contentId: $contentId})
            `,
            { userId, contentId, title }
          );
          // Create DESCRIBES relationship
          await session.run(
            `
            MATCH (t:Tag {name: $tagName}), (c:Content {userId: $userId, contentId: $contentId})
            MERGE (t)-[:DESCRIBES]->(c)'
            `,
            { tagName, userId, contentId }
          );
        }
      } finally {
        await session.close();
      }
      return content;
    },
    // Delete content from both Postgres and Neo4j
    async deleteContent(_, { contentId }) {
      // 1. Delete the content node and its relationships from Neo4j
      const session = neo4jDriver.session();
      try {
        await session.run(
          `
          MATCH (c:Content {contentId: $contentId})
          DETACH DELETE c
          `,
          { contentId }
        );
      } catch (e) {
        console.error('Neo4j delete error:', e);
        return false;
      } finally {
        await session.close();
      }
      // 2. Delete the content from Postgres
      try {
        await pgPool.query('DELETE FROM contents WHERE contentId = $1', [contentId]);
      } catch (e) {
        console.error('Postgres delete error:', e);
        return false;
      }
      return true;
    }
  }
};
