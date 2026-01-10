import { gql } from "@apollo/client";

// Define the GraphQL mutation
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

// TypeScript types for the mutation
export interface CreateUserInput {
  idToken: string;
  firstName: string;
  lastName: string;
}

export interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  firebaseUid: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateUserData {
  createUser: {
    user: User;
    token: string;
  };
}
