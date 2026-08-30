import { and, asc, eq } from "drizzle-orm";

import { db } from "../../db/client.js";
import { reviews } from "../../db/schema.js";
import type { ReviewUpdate } from "./schemas.js";

export async function listReviewsByProfessorId(professorId: number) {
  return db
    .select({
      id: reviews.id,
      professorId: reviews.professorId,
      rating: reviews.rating,
      comment: reviews.comment,
    })
    .from(reviews)
    .where(eq(reviews.professorId, professorId))
    .orderBy(asc(reviews.id));
}

export async function createReview({
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
    });

  return review;
}

export async function deleteReview({
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
    });

  return deletedReviews.at(0);
}

export async function updateReview({
  professorId,
  reviewId,
  ...update
}: {
  professorId: number;
  reviewId: number;
} & ReviewUpdate) {
  const updatedReviews = await db
    .update(reviews)
    .set(update)
    .where(and(eq(reviews.id, reviewId), eq(reviews.professorId, professorId)))
    .returning({
      id: reviews.id,
      professorId: reviews.professorId,
      rating: reviews.rating,
      comment: reviews.comment,
    });

  return updatedReviews.at(0);
}
