# User Management API

This document describes the user management features added to the GraphQL API.

## Database Schema

The users table has been updated with the following fields:
- `userId` (UUID, Primary Key)
- `firstName` (TEXT, Required)
- `lastName` (TEXT, Required)
- `email` (TEXT, Unique, Required)
- `passwordHash` (TEXT, Required) - bcrypt hashed password
- `createdAt` (TIMESTAMPTZ, Default: NOW())
- `updatedAt` (TIMESTAMPTZ, Default: NOW())

## Authentication

The API uses JWT tokens for authentication. Tokens are returned when users register or log in.

### Environment Variables
- `JWT_SECRET`: Secret key for JWT signing (defaults to 'your-secret-key' in development)

## GraphQL Queries

### Public Queries (No Authentication Required)

#### `login(email: String!, password: String!): AuthResponse`
Log in with email and password.
```graphql
mutation {
  login(email: "user@example.com", password: "password123") {
    user {
      userId
      firstName
      lastName
      email
      createdAt
    }
    token
  }
}
```

#### `createUser(firstName: String!, lastName: String!, email: String!, password: String!): AuthResponse`
Create a new user account.
```graphql
mutation {
  createUser(
    firstName: "John"
    lastName: "Doe"
    email: "john@example.com"
    password: "password123"
  ) {
    user {
      userId
      firstName
      lastName
      email
      createdAt
    }
    token
  }
}
```

### Protected Queries (Authentication Required)

#### `getUser(userId: ID!): User`
Get user information by ID.
```graphql
query {
  getUser(userId: "user-uuid") {
    userId
    firstName
    lastName
    email
    createdAt
    updatedAt
  }
}
```

#### `getUserByEmail(email: String!): User`
Get user information by email.
```graphql
query {
  getUserByEmail(email: "user@example.com") {
    userId
    firstName
    lastName
    email
    createdAt
    updatedAt
  }
}
```

#### `getAllUsers: [User!]!`
Get all users (admin functionality).
```graphql
query {
  getAllUsers {
    userId
    firstName
    lastName
    email
    createdAt
    updatedAt
  }
}
```

## GraphQL Mutations

### Protected Mutations (Authentication Required)

#### `updateUser(userId: ID!, firstName: String, lastName: String, email: String): User`
Update user information.
```graphql
mutation {
  updateUser(
    userId: "user-uuid"
    firstName: "Jane"
    lastName: "Smith"
    email: "jane@example.com"
  ) {
    userId
    firstName
    lastName
    email
    updatedAt
  }
}
```

#### `deleteUser(userId: ID!): Boolean`
Delete a user and all associated content.
```graphql
mutation {
  deleteUser(userId: "user-uuid")
}
```

#### `changePassword(userId: ID!, currentPassword: String!, newPassword: String!): Boolean`
Change user password.
```graphql
mutation {
  changePassword(
    userId: "user-uuid"
    currentPassword: "oldpassword"
    newPassword: "newpassword123"
  )
}
```

## Using Authentication

To access protected endpoints, include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Error Handling

The API returns appropriate GraphQL errors for:
- Invalid credentials
- User not found
- Email already exists
- Authentication required
- Invalid or expired tokens

## Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt with 10 salt rounds
2. **JWT Tokens**: Secure token-based authentication
3. **Input Validation**: Email uniqueness, required fields validation
4. **Cascade Deletion**: When a user is deleted, all their content is also removed

## Example Usage

### 1. Create a new user
```graphql
mutation {
  createUser(
    firstName: "Alice"
    lastName: "Johnson"
    email: "alice@example.com"
    password: "securepassword123"
  ) {
    user {
      userId
      firstName
      lastName
      email
    }
    token
  }
}
```

### 2. Log in
```graphql
mutation {
  login(email: "alice@example.com", password: "securepassword123") {
    user {
      userId
      firstName
      lastName
      email
    }
    token
  }
}
```

### 3. Update user profile (with authentication)
```graphql
mutation {
  updateUser(
    userId: "user-uuid"
    firstName: "Alice"
    lastName: "Smith"
    email: "alice.smith@example.com"
  ) {
    userId
    firstName
    lastName
    email
    updatedAt
  }
}
```

## Dependencies Added

- `bcrypt`: For password hashing
- `jsonwebtoken`: For JWT token generation and verification
- `@types/bcrypt`: TypeScript types for bcrypt
- `@types/jsonwebtoken`: TypeScript types for jsonwebtoken 