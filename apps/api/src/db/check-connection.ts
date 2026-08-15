import { sql } from "drizzle-orm";

import { closeDatabase, db } from "./client.js";

try {
  await db.execute(sql`SELECT 1`);
  console.log("Database connection successful.");
} catch (error) {
  console.error("Database connection failed.", error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
