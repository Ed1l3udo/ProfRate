import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { expect, it } from "vitest";

import { getIntegrationContext } from "./database.js";

const migrationFile = fileURLToPath(
  new URL("../../drizzle/0007_narrow_pete_wisdom.sql", import.meta.url),
);

it("backfills a populated legacy professor review with the real 0007 migration", async () => {
  const { database } = getIntegrationContext();
  const migration = await readFile(migrationFile, "utf8");
  const client = await database.pool.connect();
  const createdAt = new Date("2025-01-10T12:00:00.000Z");
  const updatedAt = new Date("2025-01-12T15:30:00.000Z");

  try {
    await client.query("BEGIN");
    await client.query('DROP TABLE "helpful_reviews"');
    await client.query('DROP TABLE "favorite_disciplines"');
    await client.query('DROP TABLE "favorite_professors"');
    await client.query('DROP TABLE "reports"');
    await client.query('DROP TABLE "reviews"');
    await client.query(`
      CREATE TABLE "reviews" (
        "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "professor_id" integer NOT NULL REFERENCES "professors"("id") ON DELETE cascade,
        "author_id" integer REFERENCES "users"("id") ON DELETE set null,
        "rating" integer NOT NULL,
        "comment" text NOT NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "reviews_rating_between_1_and_5" CHECK ("rating" BETWEEN 1 AND 5),
        CONSTRAINT "reviews_comment_not_blank" CHECK (length(trim("comment")) > 0),
        CONSTRAINT "reviews_comment_max_500" CHECK (char_length("comment") <= 500)
      )
    `);
    await client.query(
      `INSERT INTO "reviews"
        ("id", "professor_id", "author_id", "rating", "comment", "created_at", "updated_at")
       OVERRIDING SYSTEM VALUE VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [37, 1, 1, 4, "Avaliação legada preservada.", createdAt, updatedAt],
    );

    for (const statement of migration.split("--> statement-breakpoint")) {
      if (statement.trim() !== "") await client.query(statement);
    }

    const result = await client.query<{
      id: number;
      professor_id: number | null;
      discipline_id: number | null;
      author_id: number | null;
      didactics: number | null;
      clarity: number | null;
      punctuality: number | null;
      availability: number | null;
      rating: number;
      comment: string;
      created_at: Date;
      updated_at: Date;
    }>(`SELECT * FROM "reviews" WHERE "id" = 37`);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: 37,
      professor_id: 1,
      discipline_id: null,
      author_id: 1,
      didactics: 4,
      clarity: 4,
      punctuality: 4,
      availability: 4,
      rating: 4,
      comment: "Avaliação legada preservada.",
    });
    expect(result.rows[0].created_at.toISOString()).toBe(createdAt.toISOString());
    expect(result.rows[0].updated_at.toISOString()).toBe(updatedAt.toISOString());
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
});
