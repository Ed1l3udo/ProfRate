import { z } from "zod";

const positiveIntegerStringSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(2_147_483_647));

export const disciplineFiltersSchema = z
  .object({
    search: z.string().trim().min(1).optional(),
    departmentId: positiveIntegerStringSchema.optional(),
    courseId: positiveIntegerStringSchema.optional(),
  })
  .strict();

export const disciplineIdParamsSchema = z.object({ id: positiveIntegerStringSchema });

export const invalidDisciplineFiltersError = {
  code: "INVALID_DISCIPLINE_FILTERS",
  message: "Discipline filters must contain non-empty search text and positive integer ids.",
};

export const invalidDisciplineIdError = {
  code: "INVALID_DISCIPLINE_ID",
  message: "Discipline id must be a positive integer.",
};

export const disciplineNotFoundError = {
  code: "DISCIPLINE_NOT_FOUND",
  message: "Discipline not found.",
};

export type DisciplineFilters = z.infer<typeof disciplineFiltersSchema>;
