import axios from 'axios';
import { GraphQLDateTime, GraphQLJSON } from 'graphql-scalars';
import { pgPool } from './db/postgres';
import { neo4jDriver } from './db/neo4j';
import { GraphQLError } from 'graphql';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { requireAuth, AuthContext } from './auth';
import { mapUserFromPostgres, mapUsersFromPostgres, mapContentFromPostgres } from './utils';

// JWT secret - in production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const resolvers = {
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,
  Query: {
    // User management queries
    async getUser(_, { userId }, context: AuthContext) {
      requireAuth(context);
      const result = await pgPool.query(
        'SELECT userId, firstName, lastName, email, createdAt, updatedAt FROM users WHERE userId = $1',
        [userId]
      );
      if (!result.rows.length) {
        throw new GraphQLError('User not found');
      }
      const user = result.rows[0];
      return mapUserFromPostgres(user);
    },
    async getUserByEmail(_, { email }) {
      const result = await pgPool.query(
        'SELECT userId, firstName, lastName, email, createdAt, updatedAt FROM users WHERE email = $1',
        [email]
      );
      if (!result.rows.length) {
        throw new GraphQLError('User not found');
      }
      const user = result.rows[0];
      return mapUserFromPostgres(user);
    },
    async getAllUsers() {
      const result = await pgPool.query(
        'SELECT userId, firstName, lastName, email, createdAt, updatedAt FROM users ORDER BY createdAt DESC'
      );
      
      return mapUsersFromPostgres(result.rows);
    },
    // Get all content information
    async content(_, { contentId }) {
      // Fetch content from Postgres
      const result = await pgPool.query('SELECT * FROM contents WHERE contentid = $1', [contentId]);
      if (!result.rows.length) {
        throw new GraphQLError('Content not found');
      }
      return mapContentFromPostgres(result.rows[0]);
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
                contentId: content.identity,
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
    },
    // Get all content for a specific tag
    async getContentByTag(_, { userId, tagName }) {
      // Check if user exists in Postgres
      const userResult = await pgPool.query('SELECT 1 FROM users WHERE userId = $1', [userId]);
      if (userResult.rowCount === 0) {
        throw new GraphQLError('User not found');
      }

      const session = neo4jDriver.session();
      try {
        // Find all content nodes connected to the specified tag
        const result = await session.run(
          `
          MATCH (t:Tag {name: $tagName})-[:DESCRIBES]->(c:Content {userId: $userId})
          RETURN c.contentId AS contentId
          `,
          { tagName, userId }
        );

        if (result.records.length === 0) {
          return [];
        }

        // Get content IDs from Neo4j results
        const contentIds = result.records.map(record => record.get('contentId'));

        // Fetch content details from Postgres
        const placeholders = contentIds.map((_, index) => `$${index + 1}`).join(',');
        const contentResult = await pgPool.query(
          `SELECT * FROM contents WHERE contentid = ANY($1) AND userid = $2`,
          [contentIds, userId]
        );

        return contentResult.rows.map(mapContentFromPostgres);
      } finally {
        await session.close();
      }
    }
  },
  Mutation: {
    // User management mutations
    async login(_, { email, password }) {
      // Get user with password hash
      const result = await pgPool.query(
        'SELECT userId, firstName, lastName, email, passwordHash, createdAt, updatedAt FROM users WHERE email = $1',
        [email]
      );
      
      if (!result.rows.length) {
        throw new GraphQLError('Invalid email or password');
      }
      
      const user = result.rows[0];
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordhash);
      if (!isValidPassword) {
        throw new GraphQLError('Invalid email or password');
      }
      
      const token = jwt.sign(
        { userId: user.userid, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Remove password hash from response and map column names
      const { passwordhash, ...userWithoutPassword } = user;
      const mappedUser = mapUserFromPostgres(userWithoutPassword);
      return {
        user: mappedUser,
        token
      };
    },
    async createUser(_, { firstName, lastName, email, password }) {
      // Check if user already exists
      const existingUser = await pgPool.query(
        'SELECT 1 FROM users WHERE email = $1',
        [email]
      );
      
      if (existingUser.rowCount > 0) {
        throw new GraphQLError('User with this email already exists');
      }
      
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Insert new user
      const result = await pgPool.query(
        'INSERT INTO users (firstName, lastName, email, passwordHash) VALUES ($1, $2, $3, $4) RETURNING userId, firstName, lastName, email, createdAt, updatedAt',
        [firstName, lastName, email, passwordHash]
      );
      
      const user = result.rows[0];
      const mappedUser = mapUserFromPostgres(user);
      // Generate JWT token
      const token = jwt.sign(
        { userId: user.userid, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      return {
        user: mappedUser,
        token
      };
    },
    async updateUser(_, { userId, firstName, lastName, email }, context: AuthContext) {
      requireAuth(context);
      
      // Check if user exists
      const existingUser = await pgPool.query(
        'SELECT 1 FROM users WHERE userId = $1',
        [userId]
      );
      
      if (existingUser.rowCount === 0) {
        throw new GraphQLError('User not found');
      }
      
      // Check if email is being changed and if it's already taken
      if (email) {
        const emailCheck = await pgPool.query(
          'SELECT 1 FROM users WHERE email = $1 AND userId != $2',
          [email, userId]
        );
        
        if (emailCheck.rowCount > 0) {
          throw new GraphQLError('Email is already taken by another user');
        }
      }
      
      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      if (firstName !== undefined) {
        updates.push(`firstName = $${paramCount}`);
        values.push(firstName);
        paramCount++;
      }
      
      if (lastName !== undefined) {
        updates.push(`lastName = $${paramCount}`);
        values.push(lastName);
        paramCount++;
      }
      
      if (email !== undefined) {
        updates.push(`email = $${paramCount}`);
        values.push(email);
        paramCount++;
      }
      
      updates.push(`updatedAt = NOW()`);
      values.push(userId);
      
      const updateQuery = `
        UPDATE users 
        SET ${updates.join(', ')} 
        WHERE userId = $${paramCount}
        RETURNING userId, firstName, lastName, email, createdAt, updatedAt
      `;
      
      const result = await pgPool.query(updateQuery, values);
      
      const user = result.rows[0];
      
      // Map PostgreSQL column names to GraphQL field names
      return mapUserFromPostgres(user);
    },
    async deleteUser(_, { userId }, context: AuthContext) {
      requireAuth(context);
      
      // Check if user exists
      const existingUser = await pgPool.query(
        'SELECT 1 FROM users WHERE userId = $1',
        [userId]
      );
      
      if (existingUser.rowCount === 0) {
        return false;
      }
      
      // Delete user's content from Neo4j
      const session = neo4jDriver.session();
      try {
        await session.run(
          'MATCH (c:Content {userId: $userId}) DETACH DELETE c',
          { userId }
        );
      } finally {
        await session.close();
      }
      
      // Delete user's content from Postgres
      await pgPool.query(
        'DELETE FROM contents WHERE userId = $1',
        [userId]
      );
      
      // Delete user from Postgres
      const result = await pgPool.query(
        'DELETE FROM users WHERE userId = $1',
        [userId]
      );
      
      return result.rowCount > 0;
    },
    async changePassword(_, { userId, currentPassword, newPassword }, context: AuthContext) {
      requireAuth(context);
      
      // Get user with password hash
      const result = await pgPool.query(
        'SELECT passwordHash FROM users WHERE userId = $1',
        [userId]
      );
      
      if (!result.rows.length) {
        throw new GraphQLError('User not found');
      }
      
      const user = result.rows[0];
      
      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordhash);
      if (!isValidPassword) {
        throw new GraphQLError('Current password is incorrect');
      }
      
      // Hash new password
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password
      await pgPool.query(
        'UPDATE users SET passwordHash = $1, updatedAt = NOW() WHERE userId = $2',
        [newPasswordHash, userId]
      );
      
      return true;
    },
    // Add new content, generate tags using LLM, insert into Postgres and Neo4j
    async addContent(_, { userId, title, type, properties }) {
      // 0. Ensure user exists in Postgres users table
      const userResult = await pgPool.query(
        'SELECT 1 FROM users WHERE userId = $1', [userId]
      );
      if (userResult.rowCount === 0) {
        throw new GraphQLError('User does not exist');
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
        // Continue without tags if LLM service fails
      }

      // 3. For each tag, update/create in Neo4j
      const session = neo4jDriver.session();
      try {
        for (const tagName of tags) {
          // Check if tag exists
          const tagRes = await session.run(
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
            MERGE (c:Content {userId: $userId, contentId: $contentId, title: $title})
            `,
            { userId, contentId, title }
          );
          // Create DESCRIBES relationship
          await session.run(
            `
            MATCH (t:Tag {name: $tagName}), (c:Content {userId: $userId, contentId: $contentId})
            MERGE (t)-[:DESCRIBES]->(c)
            `,
            { tagName, userId, contentId }
          );
        }
      } finally {
        await session.close();
      }
      return mapContentFromPostgres(content);
    },
    // Update existing content
    async updateContent(_, { contentId, title, type, properties }) {
      // Check if content exists in Postgres
      const contentResult = await pgPool.query(
        'SELECT * FROM contents WHERE contentid = $1', 
        [contentId]
      );
      
      if (contentResult.rowCount === 0) {
        throw new GraphQLError('Content not found');
      }

      const existingContent = contentResult.rows[0];

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramCount = 1;
      
      if (title !== undefined) {
        updates.push(`title = $${paramCount}`);
        values.push(title);
        paramCount++;
      }
      
      if (type !== undefined) {
        updates.push(`type = $${paramCount}`);
        values.push(type);
        paramCount++;
      }
      
      if (properties !== undefined) {
        updates.push(`properties = $${paramCount}`);
        values.push(properties);
        paramCount++;
      }
      
      if (updates.length === 0) {
        // No updates provided, return existing content
        return mapContentFromPostgres(existingContent);
      }
      
      values.push(contentId);
      
      const updateQuery = `
        UPDATE contents 
        SET ${updates.join(', ')} 
        WHERE contentid = $${paramCount}
        RETURNING *
      `;
      
      const result = await pgPool.query(updateQuery, values);
      const updatedContent = result.rows[0];
      
      return mapContentFromPostgres(updatedContent);
    },
    // Delete content from both Postgres and Neo4j
    async deleteContent(_, { contentId }) {
      const contentResult = await pgPool.query(
        'SELECT 1 FROM contents WHERE contentId = $1', 
        [contentId]
      );
      
      if (contentResult.rowCount === 0) {
        return false;
      }

      const session = neo4jDriver.session();
      try {
        const neo4jResult = await session.run(
          `MATCH (c:Content {contentId: $contentId}) DETACH DELETE c RETURN count(c) as deleted`,
          { contentId }
        );
        const deletedCount = neo4jResult.records[0]?.get('deleted')?.toNumber() || 0;
        
        const pgResult = await pgPool.query(
          'DELETE FROM contents WHERE contentId = $1', 
          [contentId]
        );
        
        return pgResult.rowCount > 0 && deletedCount > 0;
      } finally {
        await session.close();
      }
    }
  }
};
