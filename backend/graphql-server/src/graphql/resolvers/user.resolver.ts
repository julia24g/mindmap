import { userService } from "../../services/user.service";

export const userResolvers = {
  Query: {},
  Mutation: {
    createUser: async (_: any, args: any, ctx: any) => {
      return await userService.createUser(args, ctx);
    },
  },
};
