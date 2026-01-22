CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id bigint GENERATED ALWAYS AS IDENTITY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  firebase_uid text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS dashboards (
  id bigint GENERATED ALWAYS AS IDENTITY,
  user_id bigint NOT NULL REFERENCES users,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  public_url text UNIQUE
);

CREATE TABLE IF NOT EXISTS contents (
  id bigint GENERATED ALWAYS AS IDENTITY,
  user_id bigint NOT NULL REFERENCES users,
  dashboard_id bigint NOT NULL REFERENCES dashboards,
  title text NOT NULL,
  type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  properties jsonb
);
