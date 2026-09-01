import { createDatabase } from "./database.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be configured.");
}

export const database = createDatabase(connectionString);
export const db = database.db;
export const pool = database.pool;

export async function closeDatabase(): Promise<void> {
  await database.close();
}
