import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pgPool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER || 'myuser',
  password: process.env.PG_PASSWORD || 'mypass',
  database: process.env.PG_DATABASE || 'mydb',
});
