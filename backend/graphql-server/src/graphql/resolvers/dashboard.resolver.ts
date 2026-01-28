import { dashboardService } from "../../services/dashboard.service";

export const dashboardResolvers = {
  Query: {
    getDashboard: async (_: any, args: any, ctx: any) => {
      return await dashboardService.getDashboard(args, ctx);
    },

    getPublicDashboard: async (_: any, args: any) => {
      return await dashboardService.getPublicDashboard(args);
    },

    getDashboards: async (_: any, args: any, ctx: any) => {
      return await dashboardService.getDashboards(args, ctx);
    },
  },

  Mutation: {
    createDashboard: async (_: any, args: any, ctx: any) => {
      return await dashboardService.createDashboard(args, ctx);
    },

    publishDashboard: async (_: any, args: any, ctx: any) => {
      return await dashboardService.publishDashboard(args, ctx);
    },
    unpublishDashboard: async (_: any, args: any, ctx: any) => {
      return await dashboardService.unpublishDashboard(args, ctx);
    },
  },
};
