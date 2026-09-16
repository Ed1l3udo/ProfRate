import { z } from "zod";

const id = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().positive());
export const resourceIdSchema = z.object({ id }).strict();
export const rankingQuerySchema = z.object({ departmentId: id.optional(), courseId: id.optional(), limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(50)).optional() }).strict();
export const invalidDiscoveryInput = { code: "INVALID_DISCOVERY_INPUT", message: "Discovery request contains invalid fields." };
export const discoveryNotFound = { code: "DISCOVERY_RESOURCE_NOT_FOUND", message: "The requested resource is not available." };
export const reviewNotHelpful = { code: "REVIEW_NOT_HELPFUL", message: "This review cannot be marked helpful." };
export const ownReviewHelpful = { code: "OWN_REVIEW_HELPFUL", message: "You cannot mark your own review helpful." };
