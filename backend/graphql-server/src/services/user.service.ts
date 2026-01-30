import { GraphQLError } from "graphql";
import { prisma } from "../lib/prisma";
import { requireUser } from "../auth";

export const userService = {
  async createUser(
    {
      firstName,
      lastName,
    }: {
      firstName: string;
      lastName: string;
    },
    ctx: any,
  ) {
    const authUser = requireUser(ctx);
    const firebaseUid = authUser.firebaseUid;
    const email = authUser.email;

    if (!email) {
      throw new GraphQLError("Email not found in Firebase token");
    }

    const existingUser = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (existingUser) {
      return { user: existingUser };
    }

    const user = await prisma.user.create({
      data: { firstName, lastName, email, firebaseUid },
    });

    return { user: user };
  },
};
