import { gql } from "@apollo/client";
import { User } from "@/types";

export const CREATE_USER = gql`
  mutation CreateUser(
    $firstName: String!
    $lastName: String!
  ) {
    createUser(firstName: $firstName, lastName: $lastName) {
      user {
        id
        firstName
        lastName
        email
        firebaseUid
        createdAt
        updatedAt
      }
    }
  }
`;

export interface CreateUserInput {
  firstName: string;
  lastName: string;
}

export interface CreateUserData {
  createUser: {
    user: User;
  };
}
