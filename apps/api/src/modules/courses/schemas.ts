import { z } from "zod";

const positiveIntegerQuerySchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(2_147_483_647));

export const courseFiltersSchema = z
  .object({ departmentId: positiveIntegerQuerySchema.optional() })
  .strict();

export const invalidCourseFiltersError = {
  code: "INVALID_COURSE_FILTERS",
  message: "Course filters must contain a positive integer departmentId.",
};

export type CourseFilters = z.infer<typeof courseFiltersSchema>;
