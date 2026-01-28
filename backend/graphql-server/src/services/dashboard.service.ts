import { GraphQLError } from "graphql";
import { prisma } from "../lib/prisma";
import { requireUser } from "../auth";
import { makePublicSlug } from "../util/publicSlug";

export const dashboardService = {
  async getDashboard({ dashboardId }: { dashboardId: string }, ctx: any) {
    const user = requireUser(ctx);
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
    });
    if (!dashboard) {
      throw new GraphQLError("Dashboard not found");
    }
    if (dashboard.userId !== user.id) {
      throw new GraphQLError("Unauthorized access to dashboard");
    }
    return dashboard;
  },

  async getPublicDashboard({ publicSlug }: { publicSlug: string }) {
    const dashboard = await prisma.dashboard.findUnique({
      where: { publicSlug: publicSlug, visibility: "PUBLIC" } as any,
    });
    if (!dashboard) {
      throw new GraphQLError("Dashboard not found");
    }
    return dashboard;
  },

  async getDashboards(_: any, ctx: any) {
    const user = requireUser(ctx);
    const dashboards = await prisma.dashboard.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        publicSlug: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return dashboards;
  },

  async createDashboard({ name }: { name: string }, ctx: any) {
    const user = requireUser(ctx);
    const dashboard = await prisma.dashboard.create({
      data: { name, user: { connect: { id: user.id } } },
    });
    return dashboard;
  },

  async publishDashboard({ dashboardId }: { dashboardId: string }, ctx: any) {
    const user = requireUser(ctx);

    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
    });

    if (!dashboard) {
      throw new GraphQLError("Dashboard not found");
    }

    if (dashboard.userId !== user.id) {
      throw new GraphQLError("Unauthorized access to dashboard");
    }

    if (dashboard.publicSlug) {
      const updated = await prisma.dashboard.update({
        where: { id: dashboardId },
        data: { visibility: "PUBLIC", publishedAt: new Date() },
      });
      return updated;
    }

    let lastErr: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = makePublicSlug();
      try {
        const updated = await prisma.dashboard.update({
          where: { id: dashboardId },
          data: {
            publicSlug: slug,
            visibility: "PUBLIC",
            publishedAt: new Date(),
          },
        });
        return updated;
      } catch (e: any) {
        lastErr = e;
        if (e?.code === "P2002") {
          continue;
        }
        throw e;
      }
    }

    console.error("Failed to generate unique publicSlug", lastErr);
    throw new GraphQLError("Failed to generate unique public slug");
  },
};
