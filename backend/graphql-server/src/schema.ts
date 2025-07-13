export const typeDefs = `#graphql
    scalar DateTime
    scalar JSON
    type Content {
        contentId: ID!
        userId: ID!
        title: String!
        type: String
        created_at: DateTime!
        properties: JSON
    }
    type User {
        userId: ID!
        firstName: String!
        lastName: String!
        email: String!
        createdAt: DateTime!
        updatedAt: DateTime
    }
    type Tag {
        name: String!
        popularity: Int
    }
    type Node {
        id: ID!
        label: String!
        contentId: ID # For content nodes only
        name: String # For tag nodes only
    }
    type Edge {
        from: ID!
        to: ID!
        type: String!
    }
    type UserGraph {
        nodes: [Node!]!
        edges: [Edge!]!
    }
    type AuthResponse {
        user: User!
        token: String!
    }
    type Query {
        get_user_graph(userId: ID!): UserGraph
        content(contentId: ID!): Content
        get_all_tags: [Tag!]!
        # User management queries
        getUser(userId: ID!): User
        getUserByEmail(email: String!): User
        getAllUsers: [User!]!
    }
    type Mutation {
        addContent(
            userId: ID!
            title: String!
            type: String
            properties: JSON
        ): Content
        deleteContent(
            contentId: ID!
        ): Boolean
        # User management mutations
        login(email: String!, password: String!): AuthResponse
        createUser(
            firstName: String!
            lastName: String!
            email: String!
            password: String!
        ): AuthResponse
        updateUser(
            userId: ID!
            firstName: String
            lastName: String
            email: String
        ): User
        deleteUser(userId: ID!): Boolean
        changePassword(
            userId: ID!
            currentPassword: String!
            newPassword: String!
        ): Boolean
    }
`