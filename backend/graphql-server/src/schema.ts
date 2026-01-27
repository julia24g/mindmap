export const typeDefs = `#graphql
    scalar DateTime
    scalar JSON
    type Content {
        id: ID!
        dashboardId: ID!
        title: String!
        type: String
        createdAt: DateTime!
        updatedAt: DateTime
        notesText: String
        notesJSON: JSON
    }
    type User {
        id: ID!
        firstName: String!
        lastName: String!
        email: String!
        firebaseUid: String!
        createdAt: DateTime!
        updatedAt: DateTime
    }
    type Dashboard {
        id: ID!
        userId: ID!
        name: String!
        createdAt: DateTime!
        updatedAt: DateTime
        publicUrl: String
    }
    type Tag {
        name: String!
        popularity: Int
    }
    type Node {
        id: ID!
        label: String!
        contentId: ID # For content nodes
        name: String # For tag nodes only
        title: String # For content nodes only
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
    type UserGraphDates {
        createdAt: DateTime
        updatedAt: DateTime
    }
    type AuthResponse {
        user: User!
        token: String!
    }
    type Query {
        getGraph(firebaseUid: String!, dashboardId: ID!): UserGraph
        getDashboards(firebaseUid: String!): [Dashboard!]!
        getDashboard(firebaseUid: String!, dashboardId: ID!): Dashboard
        getContent(id: ID!, firebaseUid: String!): Content
        allTags(limit: Int): [String!]!
        getContentByTag(userId: ID!, tagName: String!): [Content!]!
        getUser(id: ID!): User
        getUserByEmail(email: String!): User
    }
    type Mutation {
        addContent(
            firebaseUid: String!
            dashboardId: ID!
            title: String!
            type: String
            notesText: String
            notesJSON: JSON
        ): Content
        updateContent(
            id: ID!
            title: String
            type: String
            notesText: String
            notesJSON: JSON
        ): Content
        deleteContent(
            id: ID!
        ): Boolean
        # User management mutations
        login(idToken: String!): AuthResponse
        createUser(
            idToken: String!
            firstName: String!
            lastName: String!
        ): AuthResponse
        updateUser(
            id: ID!
            firstName: String
            lastName: String
            email: String
        ): User
        deleteUser(id: ID!): Boolean
        # Dashboard mutations
        createDashboard(
            firebaseUid: String!
            name: String!
        ): Dashboard
    }
`;
