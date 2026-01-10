CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS contents (
  contentid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  userid uuid NOT NULL,
  title text NOT NULL,
  type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  properties jsonb
);

CREATE TABLE IF NOT EXISTS users (
  userid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firstname text NOT NULL,
  lastname text NOT NULL,
  email text NOT NULL UNIQUE,
  firebaseuid text NOT NULL UNIQUE,
  createdat timestamptz NOT NULL DEFAULT now(),
  updatedat timestamptz
);
