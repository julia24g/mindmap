import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

import { typeDefs } from './schema'
import { resolvers } from './resolvers'
import { getAuthContext, AuthContext } from './auth'
import express from 'express';

// Redis Imports
import { RedisStore } from "connect-redis"
import session from "express-session"
import { createClient } from "redis"

// Initialize Redis client
let redisClient = createClient()
redisClient.connect().catch(console.error)

// Initialize store.
let redisStore = new RedisStore({
  client: redisClient
})

const app = express();

// Initialize session storage.
app.use(
  session({
    store: redisStore,
    resave: false,
    saveUninitialized: false, 
  secret: process.env.SESSION_SECRET!,
  }),
)

const server = new ApolloServer({
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

async function startServer() {
  await server.start();
  app.use(
    '/graphql',
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }: { req: express.Request }) => {
        const authContext = getAuthContext(req.headers);
        return {
          ...authContext,
          headers: req.headers,
          session: (req as any).session
        };
      }
    })
  );
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
  });
}

startServer();