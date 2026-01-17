import { gql } from "@apollo/client";
import { User } from "@/types";

export const CREATE_USER = gql`
  mutation CreateUser(
    $idToken: String!
    $firstName: String!
    $lastName: String!
  ) {
    createUser(
      idToken: $idToken
      firstName: $firstName
      lastName: $lastName
    ) {
      user {
        userId
        firstName
        lastName
        email
        firebaseUid
        createdAt
        updatedAt
      }
      token
    }
  }
`;

export interface CreateUserInput {
  idToken: string;
  firstName: string;
  lastName: string;
}

export interface CreateUserData {
  createUser: {
    user: User;
    token: string;
  };
}
