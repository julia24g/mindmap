// db
import { pgPool } from './db/postgres';
import { neo4jDriver } from './db/neo4j';

const session = neo4jDriver.session();

export const resolvers = {
    Query: {
        async events(_, args) {
            const result = await pgPool.query('SELECT * FROM events WHERE id = $1', [args.id]);
            return result.rows;

        },
        async event(_, args) {
            return args.id
        },
        async users() {
            return 1
        }
    }
}

// Next - learn how Neo4j works, and what queries you'll need to make
// Write out those resolvers and mutations
// Test!