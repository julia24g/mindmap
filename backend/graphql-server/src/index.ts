import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { neo4jDriver } from './db/neo4j.js';
import { typeDefs } from './schema.js'
import { resolvers } from './resolvers.js'
import { getAuthContext, AuthContext } from './auth.js'

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
  })

const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async ({ req }) => {
      const authContext = getAuthContext(req.headers);
      return {
        ...authContext,
        headers: req.headers
      };
    }
})

console.log('Server ready at port', 4000)

process.on('exit', async () => {
  await neo4jDriver.close();
});