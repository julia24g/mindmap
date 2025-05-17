CREATE TABLE IF NOT EXISTS events (
  eventId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL, -- what type should this be?
  title TEXT NOT NULL,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  properties JSONB
);

CREATE TABLE IF NOT EXISTS users (
    userId UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
