import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const professors = pgTable("professors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  department: text("department").notNull(),
});

export const reviews = pgTable(
  "reviews",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    professorId: integer("professor_id")
      .notNull()
      .references(() => professors.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("reviews_rating_between_1_and_5", sql`${table.rating} BETWEEN 1 AND 5`),
    check("reviews_comment_not_blank", sql`length(trim(${table.comment})) > 0`),
    check("reviews_comment_max_500", sql`char_length(${table.comment}) <= 500`),
  ],
);
