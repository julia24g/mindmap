import { contentService } from "../../services/content.service";

export const contentResolvers = {
  Query: {
    getContent: async (_: any, args: any, ctx: any) => {
      return await contentService.getContent(args, ctx);
    },
  },

  Mutation: {
    addContent: async (_: any, args: any, ctx: any) => {
      return await contentService.addContent(args, ctx);
    },

    updateContent: async (_: any, args: any, ctx: any) => {
      return await contentService.updateContent(args, ctx);
    },

    deleteContent: async (_: any, args: any, ctx: any) => {
      return await contentService.deleteContent(args, ctx);
    },
  },
};
