import { z } from "zod";

export const reportReasonSchema = z.string().trim().min(1).refine((value) => Array.from(value).length <= 500);
export const createReportBodySchema = z.object({ reason: reportReasonSchema }).strict();
export const reportStatusBodySchema = z.object({ status: z.enum(["resolved", "dismissed"]) }).strict();
export const invalidReportInputError = { code: "INVALID_REPORT_INPUT", message: "Report requires only a non-empty reason of at most 500 characters." };
export const reportNotFoundError = { code: "REPORT_NOT_FOUND", message: "Report not found." };
export const reportConflictError = { code: "REPORT_CONFLICT", message: "Report action conflicts with its current status." };
export const duplicateReportError = { code: "DUPLICATE_REPORT", message: "You have already reported this review." };
export const reviewNotReportableError = { code: "REVIEW_NOT_REPORTABLE", message: "Only published reviews can be reported." };
export const ownReviewReportError = { code: "OWN_REVIEW_REPORT", message: "You cannot report your own review." };
