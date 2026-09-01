import { expect, it } from "vitest";

import { reviews } from "../../src/db/schema.js";
import { getIntegrationContext } from "./database.js";

function sqlStateFrom(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }

  if ("cause" in error) {
    return sqlStateFrom(error.cause);
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

  expect(sqlStateFrom(capturedError)).toBe(expectedCode);
}

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
    },
    {
      id: 2,
      professorId: 1,
      rating: 4,
      comment: "Segunda avaliação de teste.",
    },
  ]);
});

it("creates a review and returns the persisted columns", async () => {
  const { reviewsRepository } = getIntegrationContext();

  await expect(
    reviewsRepository.createReview({
      professorId: 3,
      rating: 2,
      comment: "Avaliação criada no teste.",
    }),
  ).resolves.toStrictEqual({
    id: 4,
    professorId: 3,
    rating: 2,
    comment: "Avaliação criada no teste.",
  });
});

it("partially updates a review", async () => {
  const { reviewsRepository } = getIntegrationContext();

  await expect(
    reviewsRepository.updateReview({
      professorId: 1,
      reviewId: 1,
      rating: 2,
    }),
  ).resolves.toStrictEqual({
    id: 1,
    professorId: 1,
    rating: 2,
    comment: "Primeira avaliação de teste.",
  });
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
