import express from "express";
import { professorIdParamsSchema } from "./modules/professors/schemas.js";
import type { findProfessorById as findProfessorByIdRepository } from "./modules/professors/repository.js";
import type { listProfessors as listProfessorsRepository } from "./modules/professors/repository.js";

export function createApp({
  findProfessorById,
  listProfessors,
}: {
  findProfessorById: typeof findProfessorByIdRepository;
  listProfessors: typeof listProfessorsRepository;
}) {
  const app = express();

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.get("/professors", async (_request, response) => {
    const professors = await listProfessors();

    response.status(200).json(professors);
  });

  app.get("/professors/:id", async (request, response) => {
    const parsedParams = professorIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      return response.status(400).json({
        error: {
          code: "INVALID_PROFESSOR_ID",
          message: "Professor id must be a positive integer.",
        },
      });
    }

    const professor = await findProfessorById(parsedParams.data.id);

    if (professor === undefined) {
      return response.status(404).json({
        error: {
          code: "PROFESSOR_NOT_FOUND",
          message: "Professor not found.",
        },
      });
    }

    return response.status(200).json(professor);
  });

  return app;
}
