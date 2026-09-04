import { z } from "zod";

export const REVIEW_COMMENT_MAX_LENGTH = 500;

const reviewCommentSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (comment) => Array.from(comment).length <= REVIEW_COMMENT_MAX_LENGTH,
  );

export const invalidReviewInputError = {
  code: "INVALID_REVIEW_INPUT",
  message:
    "Review body must include an integer rating from 1 to 5 and a non-empty comment of at most 500 characters.",
};

export const invalidJsonBodyError = {
  code: "INVALID_JSON_BODY",
  message: "Request body must be valid JSON.",
};

export const createReviewBodySchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: reviewCommentSchema,
  })
  .strict();

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

export const invalidReviewUpdateError = {
  code: "INVALID_REVIEW_UPDATE",
  message:
    "Review update must contain only valid fields and include an integer rating from 1 to 5 and/or a non-empty comment of at most 500 characters.",
};

export const updateReviewBodySchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: reviewCommentSchema.optional(),
  })
  .strict()
  .refine(
    (update) => update.rating !== undefined || update.comment !== undefined,
  );

export type ReviewUpdate = z.infer<typeof updateReviewBodySchema>;
