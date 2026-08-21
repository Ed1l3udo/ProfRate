import express from "express";
import {
  invalidProfessorIdError,
  professorIdParamsSchema,
  professorNotFoundError,
} from "./modules/professors/schemas.js";
import type { findProfessorById as findProfessorByIdRepository } from "./modules/professors/repository.js";
import type { listProfessors as listProfessorsRepository } from "./modules/professors/repository.js";
import type { listReviewsByProfessorId as listReviewsByProfessorIdRepository } from "./modules/reviews/repository.js";

export function createApp({
  findProfessorById,
  listProfessors,
  listReviewsByProfessorId,
}: {
  findProfessorById: typeof findProfessorByIdRepository;
  listProfessors: typeof listProfessorsRepository;
  listReviewsByProfessorId: typeof listReviewsByProfessorIdRepository;
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
        error: invalidProfessorIdError,
      });
    }

    const professor = await findProfessorById(parsedParams.data.id);

    if (professor === undefined) {
      return response.status(404).json({
        error: professorNotFoundError,
      });
    }

    return response.status(200).json(professor);
  });

  app.get("/professors/:id/reviews", async (request, response) => {
    const parsedParams = professorIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      return response.status(400).json({
        error: invalidProfessorIdError,
      });
    }

    const professor = await findProfessorById(parsedParams.data.id);

    if (professor === undefined) {
      return response.status(404).json({
        error: professorNotFoundError,
      });
    }

    const reviews = await listReviewsByProfessorId(parsedParams.data.id);

    return response.status(200).json(reviews);
  });

  return app;
}
