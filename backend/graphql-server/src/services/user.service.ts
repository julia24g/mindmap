import jwt from "jsonwebtoken";
import { GraphQLError } from "graphql";
import { getAuth } from "firebase-admin/auth";
import { prisma } from "../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

function getAdminAuth() {
  return getAuth();
}

export const userService = {
  async createUser({
    idToken,
    firstName,
    lastName,
  }: {
    idToken: string;
    firstName: string;
    lastName: string;
  }) {
    let decodedToken: any;
    try {
      decodedToken = await getAdminAuth().verifyIdToken(idToken);
    } catch (error) {
      throw new GraphQLError("Invalid Firebase ID token");
    }

    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email;

    if (!email) {
      throw new GraphQLError("Email not found in Firebase token");
    }

    const existingUser = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (existingUser) {
      throw new GraphQLError("User with this Firebase UID already exists");
    }

    const user = await prisma.user.create({
      data: { firstName, lastName, email, firebaseUid },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, firebaseUid: firebaseUid },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    return { user: user, token };
  },
};
