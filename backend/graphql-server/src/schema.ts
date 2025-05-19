export const typeDefs = `#graphql
    type Event {
        id: ID!
        user: User!
        title: String!
        type: String
        created_at: GraphQLDateTime! # look into this
        properties: JSON # look into this
    }
    type User {
        id: ID!
    }
    type Query {
        events(user: User!): [Event]
        event(id: ID!): Event
        users: [User]
        user(id: ID!): User
    }
`

// Fix the Event type
// Add the Neo4j types, whatever that looks like
// Check that all syntax looks good