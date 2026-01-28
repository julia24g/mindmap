import { GraphQLDateTime, GraphQLJSON } from "graphql-scalars";

import { dashboardResolvers } from "./dashboard.resolver";
import { contentResolvers } from "./content.resolver";
import { graphResolvers } from "./graph.resolver";
import { userResolvers } from "./user.resolver";

export const resolvers = {
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,

  Query: {
    ...dashboardResolvers.Query,
    ...contentResolvers.Query,
    ...graphResolvers.Query,
    ...userResolvers.Query,
  },

  Mutation: {
    ...dashboardResolvers.Mutation,
    ...contentResolvers.Mutation,
    ...graphResolvers.Mutation,
    ...userResolvers.Mutation,
  },
};
