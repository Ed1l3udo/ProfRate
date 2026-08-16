import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const professors = pgTable("professors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  department: text("department").notNull(),
});
