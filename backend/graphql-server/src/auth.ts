import { GraphQLError } from "graphql";

export function requireUser(ctx: any) {
  if (!ctx.user) {
    throw new GraphQLError("Unauthenticated", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  return ctx.user as { id: string; firebaseUid: string; email?: string | null };
}
