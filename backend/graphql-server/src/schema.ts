export const typeDefs = `#graphql
    scalar DateTime
    scalar JSON
    type Content {
        id: ID!
        user: User!
        title: String!
        type: String
        created_at: DateTime!
        properties: JSON
    }
    type User {
        id: ID!
    }
    type Tag {
        id: ID!
        name: String!
    }
    type Query {
        get_user_graph(userId: ID!): [Content]
        content(id: ID!): Content
        all_tags(): [Tag!]!
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