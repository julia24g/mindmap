import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { neo4jDriver } from './db/neo4j';
import { typeDefs } from './schema'
import { resolvers } from './resolvers'

// server setup
const server = new ApolloServer({
    typeDefs,
    resolvers
  })

const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 }
})

console.log('Server ready at port', 4000)

process.on('exit', async () => {
  await neo4jDriver.close();
});