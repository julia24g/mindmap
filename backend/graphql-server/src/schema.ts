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
        updatedAt: DateTime!
    }
    type Dashboard {
        id: ID!
        userId: ID!
        name: String!
        createdAt: DateTime!
        updatedAt: DateTime!
        visibility: String!
        isOwner: Boolean!
        publishedAt: DateTime
        publicSlug: String
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
        # Private
        getGraph(dashboardId: ID!): UserGraph
        getDashboards: [Dashboard!]!
        getDashboard(dashboardId: ID!): Dashboard
        getContent(id: ID!): Content

        # Public
        allTags(limit: Int): [String!]!
        getPublicDashboard(publicSlug: String!): Dashboard
        getPublicGraph(dashboardId: ID!): UserGraph
    }
    type Mutation {
        # Private
        addContent(
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
                createDashboard(
            name: String!
        ): Dashboard
                publishDashboard(
                    dashboardId: ID!
                ): Dashboard
                unpublishDashboard(
                    dashboardId: ID!
                ): Dashboard
        createUser(
            firstName: String!
            lastName: String!
        ): AuthResponse
    }
`;
