import { and, asc, desc, eq, ne, sql } from "drizzle-orm";

import type { Database } from "../../db/database.js";
import { disciplines, helpfulReviews, professors, reviews } from "../../db/schema.js";
import type {
  DisciplineRatings,
  DisciplineReviewUpdate,
  ProfessorRatings,
  ProfessorReviewUpdate,
} from "./schemas.js";

function reviewSelection() {
  return {
    id: reviews.id,
    professorId: reviews.professorId,
    disciplineId: reviews.disciplineId,
    rating: reviews.rating,
    status: reviews.status,
    didactics: reviews.didactics,
    clarity: reviews.clarity,
    punctuality: reviews.punctuality,
    availability: reviews.availability,
    difficulty: reviews.difficulty,
    relevance: reviews.relevance,
    workload: reviews.workload,
    comment: reviews.comment,
    createdAt: reviews.createdAt,
    updatedAt: reviews.updatedAt,
  };
}

type ReviewRow = Awaited<ReturnType<typeof selectReviewRows>>[number];

async function selectReviewRows(_db: Database) {
  return _db.select(reviewSelection()).from(reviews);
}

function publicReview(row: ReviewRow, canManage: boolean, helpfulCount?: number, viewerHasMarkedHelpful?: boolean, canMarkHelpful?: boolean) {
  const common = {
    id: row.id,
    rating: row.rating,
    status: row.status,
    comment: row.comment,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    canManage,
    ...(helpfulCount === undefined ? {} : { helpfulCount, viewerHasMarkedHelpful, canMarkHelpful }),
  };

  if (row.professorId !== null) {
    return {
      ...common,
      professorId: row.professorId,
      disciplineId: null,
      targetType: "professor" as const,
      ratings: {
        didactics: row.didactics!,
        clarity: row.clarity!,
        punctuality: row.punctuality!,
        availability: row.availability!,
      },
    };
  }

  return {
    ...common,
    professorId: null,
    disciplineId: row.disciplineId!,
    targetType: "discipline" as const,
    ratings: {
      difficulty: row.difficulty!,
      relevance: row.relevance!,
      workload: row.workload!,
    },
  };
}

export function createReviewsRepository(db: Database) {
  async function listReviewsByProfessorId(professorId: number, viewerUserId?: number) {
    const rows = await db
      .select({
        ...reviewSelection(),
        canManage: viewerUserId === undefined
          ? sql<boolean>`false`
          : sql<boolean>`coalesce(${reviews.authorId} = ${viewerUserId}, false)`,
        helpfulCount: sql<number>`(select count(*)::integer from ${helpfulReviews} where ${helpfulReviews.reviewId} = ${reviews.id})`,
        viewerHasMarkedHelpful: viewerUserId === undefined ? sql<boolean>`false` : sql<boolean>`exists (select 1 from ${helpfulReviews} where ${helpfulReviews.reviewId} = ${reviews.id} and ${helpfulReviews.userId} = ${viewerUserId})`,
        canMarkHelpful: viewerUserId === undefined ? sql<boolean>`false` : sql<boolean>`coalesce(${reviews.authorId} <> ${viewerUserId}, true)`,
      })
      .from(reviews)
      .where(and(eq(reviews.professorId, professorId), eq(reviews.status, "published")))
      .orderBy(asc(reviews.createdAt), asc(reviews.id));

    return rows.map(({ canManage, helpfulCount, viewerHasMarkedHelpful, canMarkHelpful, ...review }) => publicReview(review, canManage, viewerUserId === undefined ? undefined : helpfulCount, viewerHasMarkedHelpful, canMarkHelpful));
  }

  async function listReviewsByDisciplineId(disciplineId: number, viewerUserId?: number) {
    const rows = await db
      .select({
        ...reviewSelection(),
        canManage: viewerUserId === undefined
          ? sql<boolean>`false`
          : sql<boolean>`coalesce(${reviews.authorId} = ${viewerUserId}, false)`,
        helpfulCount: sql<number>`(select count(*)::integer from ${helpfulReviews} where ${helpfulReviews.reviewId} = ${reviews.id})`,
        viewerHasMarkedHelpful: viewerUserId === undefined ? sql<boolean>`false` : sql<boolean>`exists (select 1 from ${helpfulReviews} where ${helpfulReviews.reviewId} = ${reviews.id} and ${helpfulReviews.userId} = ${viewerUserId})`,
        canMarkHelpful: viewerUserId === undefined ? sql<boolean>`false` : sql<boolean>`coalesce(${reviews.authorId} <> ${viewerUserId}, true)`,
      })
      .from(reviews)
      .where(and(eq(reviews.disciplineId, disciplineId), eq(reviews.status, "published")))
      .orderBy(asc(reviews.createdAt), asc(reviews.id));

    return rows.map(({ canManage, helpfulCount, viewerHasMarkedHelpful, canMarkHelpful, ...review }) => publicReview(review, canManage, viewerUserId === undefined ? undefined : helpfulCount, viewerHasMarkedHelpful, canMarkHelpful));
  }

  async function createProfessorReview(input: {
    professorId: number;
    authorId: number;
    ratings: ProfessorRatings;
    comment: string;
  }) {
    const [row] = await db.insert(reviews).values({
      professorId: input.professorId,
      authorId: input.authorId,
      ...input.ratings,
      comment: input.comment,
    }).returning(reviewSelection());

    return publicReview(row!, true);
  }

  async function createDisciplineReview(input: {
    disciplineId: number;
    authorId: number;
    ratings: DisciplineRatings;
    comment: string;
  }) {
    const [row] = await db.insert(reviews).values({
      disciplineId: input.disciplineId,
      authorId: input.authorId,
      ...input.ratings,
      comment: input.comment,
    }).returning(reviewSelection());

    return publicReview(row!, true);
  }

  async function findProfessorReviewOwnership(input: { professorId: number; reviewId: number }) {
    const rows = await db.select({ authorId: reviews.authorId }).from(reviews).where(and(
      eq(reviews.id, input.reviewId),
      eq(reviews.professorId, input.professorId),
    )).limit(1);
    return rows.at(0);
  }

  async function findDisciplineReviewOwnership(input: { disciplineId: number; reviewId: number }) {
    const rows = await db.select({ authorId: reviews.authorId }).from(reviews).where(and(
      eq(reviews.id, input.reviewId),
      eq(reviews.disciplineId, input.disciplineId),
    )).limit(1);
    return rows.at(0);
  }

  async function deleteProfessorReview(input: { professorId: number; reviewId: number; authorId: number }) {
    const rows = await db.delete(reviews).where(and(
      eq(reviews.id, input.reviewId),
      eq(reviews.professorId, input.professorId),
      eq(reviews.authorId, input.authorId),
    )).returning({ id: reviews.id });
    return rows.at(0);
  }

  async function deleteDisciplineReview(input: { disciplineId: number; reviewId: number; authorId: number }) {
    const rows = await db.delete(reviews).where(and(
      eq(reviews.id, input.reviewId),
      eq(reviews.disciplineId, input.disciplineId),
      eq(reviews.authorId, input.authorId),
    )).returning({ id: reviews.id });
    return rows.at(0);
  }

  async function updateProfessorReview(input: {
    professorId: number;
    reviewId: number;
    authorId: number;
  } & ProfessorReviewUpdate) {
    const rows = await db.update(reviews).set({
      ...input.ratings,
      comment: input.comment,
      status: "pending",
      updatedAt: sql`now()`,
    }).where(and(
      eq(reviews.id, input.reviewId),
      eq(reviews.professorId, input.professorId),
      eq(reviews.authorId, input.authorId),
      ne(reviews.status, "removed"),
    )).returning(reviewSelection());
    const row = rows.at(0);
    return row === undefined ? undefined : publicReview(row, true);
  }

  async function updateDisciplineReview(input: {
    disciplineId: number;
    reviewId: number;
    authorId: number;
  } & DisciplineReviewUpdate) {
    const rows = await db.update(reviews).set({
      ...input.ratings,
      comment: input.comment,
      status: "pending",
      updatedAt: sql`now()`,
    }).where(and(
      eq(reviews.id, input.reviewId),
      eq(reviews.disciplineId, input.disciplineId),
      eq(reviews.authorId, input.authorId),
      ne(reviews.status, "removed"),
    )).returning(reviewSelection());
    const row = rows.at(0);
    return row === undefined ? undefined : publicReview(row, true);
  }

  async function listReviewsByAuthorId(authorId: number) {
    const rows = await db.select({
      ...reviewSelection(),
      professorName: professors.name,
      disciplineCode: disciplines.code,
      disciplineName: disciplines.name,
    }).from(reviews)
      .leftJoin(professors, eq(professors.id, reviews.professorId))
      .leftJoin(disciplines, eq(disciplines.id, reviews.disciplineId))
      .where(eq(reviews.authorId, authorId))
      .orderBy(desc(reviews.createdAt), desc(reviews.id));

    return rows.map(({ professorName, disciplineCode, disciplineName, ...row }) => {
      const review = publicReview(row, true);
      return review.targetType === "professor"
        ? { ...review, professor: { id: review.professorId, name: professorName! } }
        : {
            ...review,
            discipline: {
              id: review.disciplineId,
              code: disciplineCode!,
              name: disciplineName!,
            },
          };
    });
  }

  return {
    createReview: createProfessorReview,
    createDisciplineReview,
    createProfessorReview,
    deleteReview: deleteProfessorReview,
    deleteDisciplineReview,
    deleteProfessorReview,
    findDisciplineReviewOwnership,
    findProfessorReviewOwnership,
    findReviewOwnership: findProfessorReviewOwnership,
    listReviewsByAuthorId,
    listReviewsByDisciplineId,
    listReviewsByProfessorId,
    updateDisciplineReview,
    updateReview: updateProfessorReview,
    updateProfessorReview,
  };
}

export type ReviewsRepository = ReturnType<typeof createReviewsRepository>;
