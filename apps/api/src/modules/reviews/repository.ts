import { and, asc, eq, sql } from "drizzle-orm";

import type { Database } from "../../db/database.js";
import { reviews } from "../../db/schema.js";
import type { ReviewUpdate } from "./schemas.js";

export function createReviewsRepository(db: Database) {
  async function listReviewsByProfessorId(professorId: number) {
    return db
      .select({
        id: reviews.id,
        professorId: reviews.professorId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
      })
      .from(reviews)
      .where(eq(reviews.professorId, professorId))
      .orderBy(asc(reviews.id));
  }

  async function createReview({
    professorId,
    rating,
    comment,
  }: {
    professorId: number;
    rating: number;
    comment: string;
  }) {
    const [review] = await db
      .insert(reviews)
      .values({ professorId, rating, comment })
      .returning({
        id: reviews.id,
        professorId: reviews.professorId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
      });

    return review;
  }

  async function deleteReview({
    professorId,
    reviewId,
  }: {
    professorId: number;
    reviewId: number;
  }) {
    const deletedReviews = await db
      .delete(reviews)
      .where(and(eq(reviews.id, reviewId), eq(reviews.professorId, professorId)))
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
    ...update
  }: {
    professorId: number;
    reviewId: number;
  } & ReviewUpdate) {
    const updatedReviews = await db
      .update(reviews)
      .set({ ...update, updatedAt: sql`now()` })
      .where(and(eq(reviews.id, reviewId), eq(reviews.professorId, professorId)))
      .returning({
        id: reviews.id,
        professorId: reviews.professorId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
      });

    return updatedReviews.at(0);
  }

  return {
    createReview,
    deleteReview,
    listReviewsByProfessorId,
    updateReview,
  };
}

export type ReviewsRepository = ReturnType<typeof createReviewsRepository>;
