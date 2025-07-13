CREATE TABLE IF NOT EXISTS contents (
  contentId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL,
  title TEXT NOT NULL,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  properties JSONB
);

CREATE TABLE IF NOT EXISTS users (
    userId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    createdAt TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updatedAt TIMESTAMPTZ DEFAULT NOW()
);

/**
Neo4J Schema
(:Tag {name: "tagname"})
(:Content {userId: "1234", contentId: "5678"})

(:Tag)-[:DESCRIBES]->(:Content)
(:Tag)-[:IS_SUBTAG {userId: "1234"}]->(:Tag)
**/
