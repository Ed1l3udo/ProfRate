import { z } from "zod";

export const professorIdParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform((value) => Number(value))
    .pipe(z.number().int().positive().max(2_147_483_647)),
});
