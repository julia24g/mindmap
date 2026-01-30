import neo4j from "neo4j-driver";
import dotenv from "dotenv";

dotenv.config(); // Load .env vars

export const neo4jDriver = neo4j.driver(
  process.env.NEO4J_URI || "bolt://localhost:7687",
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME || "neo4j",
    process.env.NEO4J_PASSWORD || "myneo4jpass",
  ),
);
