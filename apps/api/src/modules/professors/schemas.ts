import { z } from "zod";

export const invalidProfessorIdError = {
  code: "INVALID_PROFESSOR_ID",
  message: "Professor id must be a positive integer.",
};

export const professorNotFoundError = {
  code: "PROFESSOR_NOT_FOUND",
  message: "Professor not found.",
};

export const invalidProfessorFiltersError = {
  code: "INVALID_PROFESSOR_FILTERS",
  message: "Professor filters must be non-empty text values.",
};

export const professorIdParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform((value) => Number(value))
    .pipe(z.number().int().positive().max(2_147_483_647)),
});

const professorFilterValueSchema = z.string().trim().min(1);
const pageSchema = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().positive());

export const professorFiltersSchema = z
  .object({
    search: professorFilterValueSchema.optional(),
    department: professorFilterValueSchema.optional(),
    page: pageSchema.optional().default(1),
    pageSize: pageSchema.pipe(z.number().max(50)).optional().default(12),
  })
  .strict();

export type ProfessorFilters = { search?: string; department?: string; page?: number; pageSize?: number };
