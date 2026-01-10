#!/usr/bin/env node
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env');

require('dotenv').config({ path: envPath });
const { execSync } = require('child_process');

const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = process.env;

if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DB) {
  console.error('Missing required environment variables: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB');
  process.exit(1);
}

const DATABASE_URL = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}`;

const migrationsDir = path.resolve(__dirname, '..', 'database', 'migrations', 'postgres');

try {
  console.log('Running database migrations...');
  execSync(
    `npx node-pg-migrate up --migrations-dir "${migrationsDir}" --database-url "${DATABASE_URL}"`,
    { stdio: 'inherit', env: { ...process.env, DATABASE_URL } }
  );
  console.log('Migrations completed successfully!');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}
