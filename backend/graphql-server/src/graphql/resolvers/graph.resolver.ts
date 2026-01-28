import { graphService } from "../../services/graph.service";

export const graphResolvers = {
  Query: {
    getGraph: async (_: any, args: any, ctx: any) => {
      return await graphService.getGraph(args, ctx);
    },

    getPublicGraph: async (_: any, args: any) => {
      return await graphService.getPublicGraph(args);
    },

    allTags: async (_: any, args: any) => {
      return await graphService.allTags(args);
    },
  },

  Mutation: {},
};
