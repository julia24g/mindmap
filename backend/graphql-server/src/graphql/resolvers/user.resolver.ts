import { userService } from "../../services/user.service";

export const userResolvers = {
  Query: {},
  Mutation: {
    createUser: async (_: any, args: any) => {
      return await userService.createUser(args);
    },
  },
};
