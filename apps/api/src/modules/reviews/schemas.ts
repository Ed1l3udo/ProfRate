import { z } from "zod";

export const REVIEW_COMMENT_MAX_LENGTH = 500;

const ratingCriterionSchema = z.number().int().min(1).max(5);
const reviewCommentSchema = z
  .string()
  .trim()
  .min(1)
  .refine((comment) => Array.from(comment).length <= REVIEW_COMMENT_MAX_LENGTH);

export const professorRatingsSchema = z.object({
  didactics: ratingCriterionSchema,
  clarity: ratingCriterionSchema,
  punctuality: ratingCriterionSchema,
  availability: ratingCriterionSchema,
}).strict();

export const disciplineRatingsSchema = z.object({
  difficulty: ratingCriterionSchema,
  relevance: ratingCriterionSchema,
  workload: ratingCriterionSchema,
}).strict();

export const createProfessorReviewBodySchema = z.object({
  ratings: professorRatingsSchema,
  comment: reviewCommentSchema,
}).strict();

export const createDisciplineReviewBodySchema = z.object({
  ratings: disciplineRatingsSchema,
  comment: reviewCommentSchema,
}).strict();

export const updateProfessorReviewBodySchema = z.object({
  ratings: professorRatingsSchema.optional(),
  comment: reviewCommentSchema.optional(),
}).strict().refine(({ ratings, comment }) => ratings !== undefined || comment !== undefined);

export const updateDisciplineReviewBodySchema = z.object({
  ratings: disciplineRatingsSchema.optional(),
  comment: reviewCommentSchema.optional(),
}).strict().refine(({ ratings, comment }) => ratings !== undefined || comment !== undefined);

export const invalidReviewInputError = {
  code: "INVALID_REVIEW_INPUT",
  message: "Review body must contain the complete ratings object and a non-empty comment of at most 500 characters.",
};

export const invalidJsonBodyError = {
  code: "INVALID_JSON_BODY",
  message: "Request body must be valid JSON.",
};

export const reviewIdParamsSchema = z.object({
  reviewId: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform((value) => Number(value))
    .pipe(z.number().int().positive().max(2_147_483_647)),
});

export const invalidReviewIdError = {
  code: "INVALID_REVIEW_ID",
  message: "Review id must be a positive integer.",
};

export const reviewNotFoundError = {
  code: "REVIEW_NOT_FOUND",
  message: "Review not found.",
};

export const reviewNotOwnedError = {
  code: "REVIEW_NOT_OWNED",
  message: "You can only manage your own reviews.",
};

export const invalidReviewUpdateError = {
  code: "INVALID_REVIEW_UPDATE",
  message: "Review update must contain a complete valid ratings object and/or a non-empty comment of at most 500 characters.",
};

export type ProfessorRatings = z.infer<typeof professorRatingsSchema>;
export type DisciplineRatings = z.infer<typeof disciplineRatingsSchema>;
export type ProfessorReviewUpdate = z.infer<typeof updateProfessorReviewBodySchema>;
export type DisciplineReviewUpdate = z.infer<typeof updateDisciplineReviewBodySchema>;
