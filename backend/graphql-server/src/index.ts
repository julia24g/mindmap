import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

import { neo4jDriver } from "./db/neo4j";
import { typeDefs } from "./schema";
import { resolvers } from "./graphql/resolvers";
import "./middleware/firebaseMiddleware"; // Initialize Firebase Admin
import { GraphQLError } from "graphql/error/GraphQLError";
import { prisma } from "./lib/prisma";
import { getAuth } from "firebase-admin/auth";

type ContextUser = {
  id?: string; // your Postgres user.id
  firebaseUid: string; // firebase uid
  email?: string | null;
};

type GraphQLContext = {
  user: ContextUser | null;
  // optionally keep headers if you still need them
  headers: Record<string, any>;
};

function getBearerToken(authHeader?: string | string[]) {
  const h = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

async function buildUserFromFirebaseIdToken(
  idToken: string,
): Promise<ContextUser> {
  const decoded = await getAuth().verifyIdToken(idToken);
  const firebaseUid = decoded.uid;

  const user = await prisma.user.findUnique({
    where: { firebaseUid },
    select: { id: true, firebaseUid: true, email: true },
  });

  if (user) return user;

  return {
    id: "",
    firebaseUid,
    email: decoded.email ?? null,
  };
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (error) => {
    console.error("GraphQL Error:", error);
    return {
      message: error.message,
      path: error.path,
      extensions: error.extensions,
    };
  },
});

void (async () => {
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async ({ req }): Promise<GraphQLContext> => {
      const token = getBearerToken(req.headers.authorization);

      if (!token) {
        return { user: null, headers: req.headers };
      }

      try {
        const user = await buildUserFromFirebaseIdToken(token);
        return { user, headers: req.headers };
      } catch (e) {
        throw e;
      }
    },
  });

  console.log("Server ready at port", 4000);
})();

process.on("exit", async () => {
  await neo4jDriver.close();
});
