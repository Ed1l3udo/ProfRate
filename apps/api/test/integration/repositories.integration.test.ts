import { expect, it } from "vitest";

import { reviews } from "../../src/db/schema.js";
import { getIntegrationContext, reviewFixtureTimestamp } from "./database.js";

function databaseErrorFieldFrom(
  error: unknown,
  field: "code" | "constraint",
): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const databaseError = error as Record<string, unknown>;

  if (typeof databaseError[field] === "string") {
    return databaseError[field];
  }

  if ("cause" in databaseError) {
    return databaseErrorFieldFrom(databaseError.cause, field);
  }

  return undefined;
}

async function expectSqlState(
  operation: () => Promise<unknown>,
  expectedCode: string,
): Promise<void> {
  let capturedError: unknown;

  try {
    await operation();
  } catch (error) {
    capturedError = error;
  }

  expect(databaseErrorFieldFrom(capturedError, "code")).toBe(expectedCode);
}

async function captureDatabaseError(operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch (error) {
    return error;
  }

  throw new Error("Expected database operation to fail");
}

it("has required timestamptz columns with database defaults after migrations", async () => {
  const { database } = getIntegrationContext();
  const result = await database.pool.query<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string;
  }>(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reviews'
      AND column_name IN ('created_at', 'updated_at')
    ORDER BY column_name
  `);

  expect(result.rows).toStrictEqual([
    { column_name: "created_at", data_type: "timestamp with time zone", is_nullable: "NO", column_default: "now()" },
    { column_name: "updated_at", data_type: "timestamp with time zone", is_nullable: "NO", column_default: "now()" },
  ]);
});

it("has the explicit 500-character comment check constraint", async () => {
  const { database } = getIntegrationContext();
  const result = await database.pool.query<{
    constraint_name: string;
    definition: string;
  }>(`
    SELECT conname AS constraint_name, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conname = 'reviews_comment_max_500'
  `);

  expect(result.rows).toStrictEqual([
    {
      constraint_name: "reviews_comment_max_500",
      definition: expect.stringContaining("char_length(comment) <= 500"),
    },
  ]);
});

it("lists professors ordered by id", async () => {
  const { professorsRepository } = getIntegrationContext();

  await expect(professorsRepository.listProfessors()).resolves.toStrictEqual([
    { id: 1, name: "Alice Teste", department: "Departamento Alfa" },
    { id: 2, name: "Bruno Teste", department: "Departamento Beta" },
    { id: 3, name: "Carla Teste", department: "Departamento Gama" },
  ]);
});

it("searches professors by a case-insensitive partial name", async () => {
  const { professorsRepository } = getIntegrationContext();

  await expect(
    professorsRepository.listProfessors({ search: "LiCe" }),
  ).resolves.toStrictEqual([
    { id: 1, name: "Alice Teste", department: "Departamento Alfa" },
  ]);
});

it("filters professors by a partial department", async () => {
  const { professorsRepository } = getIntegrationContext();

  await expect(
    professorsRepository.listProfessors({ department: "beta" }),
  ).resolves.toStrictEqual([
    { id: 2, name: "Bruno Teste", department: "Departamento Beta" },
  ]);
});

it("finds an existing professor and returns undefined for a missing id", async () => {
  const { professorsRepository } = getIntegrationContext();

  await expect(professorsRepository.findProfessorById(2)).resolves.toStrictEqual(
    { id: 2, name: "Bruno Teste", department: "Departamento Beta" },
  );
  await expect(
    professorsRepository.findProfessorById(999_999),
  ).resolves.toBeUndefined();
});

it("lists reviews ordered by id", async () => {
  const { reviewsRepository } = getIntegrationContext();

  await expect(
    reviewsRepository.listReviewsByProfessorId(1),
  ).resolves.toStrictEqual([
    {
      id: 1,
      professorId: 1,
      rating: 5,
      comment: "Primeira avaliação de teste.",
      createdAt: reviewFixtureTimestamp,
      updatedAt: reviewFixtureTimestamp,
    },
    {
      id: 2,
      professorId: 1,
      rating: 4,
      comment: "Segunda avaliação de teste.",
      createdAt: reviewFixtureTimestamp,
      updatedAt: reviewFixtureTimestamp,
    },
  ]);
});

it("creates a review and returns the persisted columns", async () => {
  const { reviewsRepository } = getIntegrationContext();

  const review = await reviewsRepository.createReview({
    professorId: 3,
    rating: 2,
    comment: "Avaliação criada no teste.",
  });

  expect(review).toStrictEqual({
    id: 4,
    professorId: 3,
    rating: 2,
    comment: "Avaliação criada no teste.",
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
  });
  expect(Number.isFinite(review.createdAt.getTime())).toBe(true);
  expect(review.updatedAt.getTime()).toBe(review.createdAt.getTime());
  await expect(reviewsRepository.listReviewsByProfessorId(3))
    .resolves.toStrictEqual([review]);
});

it("persists exactly 500 comment code points through the repository", async () => {
  const { database, reviewsRepository } = getIntegrationContext();
  const comment = "🙂".repeat(500);
  const review = await reviewsRepository.createReview({
    professorId: 3,
    rating: 5,
    comment,
  });
  const result = await database.pool.query<{ character_count: number }>(
    "SELECT char_length(comment)::integer AS character_count FROM reviews WHERE id = $1",
    [review.id],
  );

  expect(review.comment).toBe(comment);
  expect(Array.from(review.comment)).toHaveLength(500);
  expect(result.rows).toStrictEqual([{ character_count: 500 }]);
});

it.each([
  ["text", "a".repeat(501)],
  ["emoji", "🙂".repeat(501)],
])("rejects 501 %s code points through the named database constraint", async (_label, comment) => {
  const { database } = getIntegrationContext();
  const error = await captureDatabaseError(() =>
    database.db.insert(reviews).values({ professorId: 1, rating: 5, comment }),
  );

  expect(databaseErrorFieldFrom(error, "code")).toBe("23514");
  expect(databaseErrorFieldFrom(error, "constraint")).toBe(
    "reviews_comment_max_500",
  );
});

it("partially updates a review", async () => {
  const { reviewsRepository } = getIntegrationContext();

  const review = await reviewsRepository.updateReview({
    professorId: 1,
    reviewId: 1,
    rating: 2,
  });

  expect(review).toStrictEqual({
    id: 1,
    professorId: 1,
    rating: 2,
    comment: "Primeira avaliação de teste.",
    createdAt: reviewFixtureTimestamp,
    updatedAt: expect.any(Date),
  });
  expect(review?.updatedAt.getTime()).toBeGreaterThan(reviewFixtureTimestamp.getTime());
  await expect(reviewsRepository.listReviewsByProfessorId(1))
    .resolves.toContainEqual(review);
});

it("does not update a review through another professor", async () => {
  const { reviewsRepository } = getIntegrationContext();

  await expect(
    reviewsRepository.updateReview({
      professorId: 2,
      reviewId: 1,
      rating: 1,
    }),
  ).resolves.toBeUndefined();
  await expect(
    reviewsRepository.listReviewsByProfessorId(1),
  ).resolves.toContainEqual({
    id: 1,
    professorId: 1,
    rating: 5,
    comment: "Primeira avaliação de teste.",
    createdAt: reviewFixtureTimestamp,
    updatedAt: reviewFixtureTimestamp,
  });
});

it("deletes a review", async () => {
  const { reviewsRepository } = getIntegrationContext();

  await expect(
    reviewsRepository.deleteReview({ professorId: 1, reviewId: 1 }),
  ).resolves.toStrictEqual({
    id: 1,
    professorId: 1,
    rating: 5,
    comment: "Primeira avaliação de teste.",
    createdAt: reviewFixtureTimestamp,
    updatedAt: reviewFixtureTimestamp,
  });
  await expect(
    reviewsRepository.listReviewsByProfessorId(1),
  ).resolves.toHaveLength(1);
});

it("does not delete a review through another professor", async () => {
  const { reviewsRepository } = getIntegrationContext();

  await expect(
    reviewsRepository.deleteReview({ professorId: 2, reviewId: 1 }),
  ).resolves.toBeUndefined();
  await expect(
    reviewsRepository.listReviewsByProfessorId(1),
  ).resolves.toContainEqual({
    id: 1,
    professorId: 1,
    rating: 5,
    comment: "Primeira avaliação de teste.",
    createdAt: reviewFixtureTimestamp,
    updatedAt: reviewFixtureTimestamp,
  });
});

it("rejects a review for a missing professor through the foreign key", async () => {
  const { reviewsRepository } = getIntegrationContext();

  await expectSqlState(
    () =>
      reviewsRepository.createReview({
        professorId: 999_999,
        rating: 5,
        comment: "Professor inexistente.",
      }),
    "23503",
  );
});

it.each([0, 6])(
  "rejects rating %i through the database check constraint",
  async (rating) => {
    const { reviewsRepository } = getIntegrationContext();

    await expectSqlState(
      () =>
        reviewsRepository.createReview({
          professorId: 1,
          rating,
          comment: "Nota inválida.",
        }),
      "23514",
    );
  },
);

it("rejects a blank comment through the database check constraint", async () => {
  const { database } = getIntegrationContext();

  await expectSqlState(
    () =>
      database.db.insert(reviews).values({
        professorId: 1,
        rating: 5,
        comment: "   ",
      }),
    "23514",
  );
});
