import { pgPool } from './db/postgres';
import { getUserGraph } from './services/graphService';

export const resolvers = {
  Query: {
    // Get all content information
    async content(_, args) {
      const result = await pgPool.query('SELECT * FROM contents WHERE id = $1', [args.id]);
      return result.rows[0];
    },
    // Get all nodes and edges in user knowledge graph
    async get_user_graph(_, args) {
      return await getUserGraph(args.userId);
    }
  }
};
