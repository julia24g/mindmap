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
        firstName: String
    }
    type Tag {
        name: String!
        popularity: Int
    }
    type Node {
        id: ID!
        label: String!
        contentId: ID!
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
    type Query {
        get_user_graph(userId: ID!): UserGraph
        content(contentId: ID!): Content
        get_all_tags: [Tag!]!
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
    }
`