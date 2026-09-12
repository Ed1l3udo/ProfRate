import { and, asc, desc, eq, sql } from "drizzle-orm";

import type { Database } from "../../db/database.js";
import { professors, reviews } from "../../db/schema.js";
import type { ReviewUpdate } from "./schemas.js";

export function createReviewsRepository(db: Database) {
  async function listReviewsByProfessorId(
    professorId: number,
    viewerUserId?: number,
  ) {
    return db
      .select({
        id: reviews.id,
        professorId: reviews.professorId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        canManage:
          viewerUserId === undefined
            ? sql<boolean>`false`
            : sql<boolean>`coalesce(${reviews.authorId} = ${viewerUserId}, false)`,
      })
      .from(reviews)
      .where(eq(reviews.professorId, professorId))
      .orderBy(asc(reviews.id));
  }

  async function createReview({
    professorId,
    rating,
    comment,
    authorId,
  }: {
    professorId: number;
    rating: number;
    comment: string;
    authorId: number;
  }) {
    const [review] = await db
      .insert(reviews)
      .values({ professorId, rating, comment, authorId })
      .returning({
        id: reviews.id,
        professorId: reviews.professorId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
      });

    return { ...review, canManage: true };
  }

  async function findReviewOwnership({
    professorId,
    reviewId,
  }: {
    professorId: number;
    reviewId: number;
  }) {
    const rows = await db
      .select({ authorId: reviews.authorId })
      .from(reviews)
      .where(and(eq(reviews.id, reviewId), eq(reviews.professorId, professorId)))
      .limit(1);

    return rows.at(0);
  }

  async function deleteReview({
    professorId,
    reviewId,
    authorId,
  }: {
    professorId: number;
    reviewId: number;
    authorId: number;
  }) {
    const deletedReviews = await db
      .delete(reviews)
      .where(
        and(
          eq(reviews.id, reviewId),
          eq(reviews.professorId, professorId),
          eq(reviews.authorId, authorId),
        ),
      )
      .returning({
        id: reviews.id,
        professorId: reviews.professorId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
      });

    return deletedReviews.at(0);
  }

  async function updateReview({
    professorId,
    reviewId,
    authorId,
    ...update
  }: {
    professorId: number;
    reviewId: number;
    authorId: number;
  } & ReviewUpdate) {
    const updatedReviews = await db
      .update(reviews)
      .set({ ...update, updatedAt: sql`now()` })
      .where(
        and(
          eq(reviews.id, reviewId),
          eq(reviews.professorId, professorId),
          eq(reviews.authorId, authorId),
        ),
      )
      .returning({
        id: reviews.id,
        professorId: reviews.professorId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
      });

    const review = updatedReviews.at(0);
    return review === undefined ? undefined : { ...review, canManage: true };
  }

  async function listReviewsByAuthorId(authorId: number) {
    const rows = await db
      .select({
        id: reviews.id,
        professorId: reviews.professorId,
        professorName: professors.name,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
      })
      .from(reviews)
      .innerJoin(professors, eq(professors.id, reviews.professorId))
      .where(eq(reviews.authorId, authorId))
      .orderBy(desc(reviews.createdAt), desc(reviews.id));

    return rows.map(({ professorName, ...review }) => ({
      ...review,
      professor: { id: review.professorId, name: professorName },
      canManage: true,
    }));
  }

  return {
    createReview,
    deleteReview,
    findReviewOwnership,
    listReviewsByAuthorId,
    listReviewsByProfessorId,
    updateReview,
  };
}

export type ReviewsRepository = ReturnType<typeof createReviewsRepository>;
