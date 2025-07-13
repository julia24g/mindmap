import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { neo4jDriver } from './db/neo4j';
import { typeDefs } from './schema'
import { resolvers } from './resolvers'
import { getAuthContext, AuthContext } from './auth'

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