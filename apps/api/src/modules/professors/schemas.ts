import { z } from "zod";

export const invalidProfessorIdError = {
  code: "INVALID_PROFESSOR_ID",
  message: "Professor id must be a positive integer.",
};

export const professorNotFoundError = {
  code: "PROFESSOR_NOT_FOUND",
  message: "Professor not found.",
};

export const professorIdParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform((value) => Number(value))
    .pipe(z.number().int().positive().max(2_147_483_647)),
});
