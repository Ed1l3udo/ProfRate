import { z } from "zod";

export const invalidReviewInputError = {
  code: "INVALID_REVIEW_INPUT",
  message:
    "Review body must include an integer rating from 1 to 5 and a non-empty comment.",
};

export const invalidJsonBodyError = {
  code: "INVALID_JSON_BODY",
  message: "Request body must be valid JSON.",
};

export const createReviewBodySchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(1),
  })
  .strict();
