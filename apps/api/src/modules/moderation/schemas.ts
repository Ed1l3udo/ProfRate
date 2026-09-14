import { z } from "zod";

const id = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().positive().max(2_147_483_647));
export const moderationReviewStatusSchema = z.object({ status: z.enum(["published", "removed"]) }).strict();
export const moderationReportStatusSchema = z.object({ status: z.enum(["resolved", "dismissed"]) }).strict();
export const moderationStatusQuerySchema = z.object({ status: z.enum(["pending", "published", "removed"]).optional() }).strict();
export const moderationReportQuerySchema = z.object({ status: z.enum(["pending", "resolved", "dismissed"]).optional() }).strict();
export const moderationUserQuerySchema = z.object({ search: z.string().trim().min(1).max(100).optional() }).strict();
export const moderationIdParamsSchema = z.object({ id });
export const invalidModerationInputError = { code: "INVALID_MODERATION_INPUT", message: "Moderation request is invalid." };
export const moderationConflictError = { code: "MODERATION_CONFLICT", message: "Moderation action conflicts with the current status." };
export const selfBlockError = { code: "SELF_BLOCK_FORBIDDEN", message: "A moderator cannot block their own account." };
export const moderationUserNotFoundError = { code: "USER_NOT_FOUND", message: "User was not found." };
