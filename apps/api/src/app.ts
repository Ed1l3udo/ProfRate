import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import {
  invalidProfessorIdError,
  invalidProfessorFiltersError,
  professorFiltersSchema,
  professorIdParamsSchema,
  professorNotFoundError,
} from "./modules/professors/schemas.js";
import type { findProfessorById as findProfessorByIdRepository } from "./modules/professors/repository.js";
import type { listProfessors as listProfessorsRepository } from "./modules/professors/repository.js";
import type { listReviewsByProfessorId as listReviewsByProfessorIdRepository } from "./modules/reviews/repository.js";
import type { createReview as createReviewRepository } from "./modules/reviews/repository.js";
import {
  invalidReviewIdError,
  invalidJsonBodyError,
  invalidReviewInputError,
  createReviewBodySchema,
  reviewIdParamsSchema,
  reviewNotFoundError,
} from "./modules/reviews/schemas.js";
import type { deleteReview as deleteReviewRepository } from "./modules/reviews/repository.js";

function isJsonParsingError(error: unknown): error is SyntaxError & {
  status: number;
  type: string;
} {
  return (
    error instanceof SyntaxError &&
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 400 &&
    "type" in error &&
    error.type === "entity.parse.failed"
  );
}

export function createApp({
  createReview,
  findProfessorById,
  listProfessors,
  listReviewsByProfessorId,
  deleteReview,
}: {
  createReview: typeof createReviewRepository;
  findProfessorById: typeof findProfessorByIdRepository;
  listProfessors: typeof listProfessorsRepository;
  listReviewsByProfessorId: typeof listReviewsByProfessorIdRepository;
  deleteReview: typeof deleteReviewRepository;
}) {
  const app = express();

  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.get("/professors", async (request, response) => {
    const parsedFilters = professorFiltersSchema.safeParse(request.query);

    if (!parsedFilters.success) {
      return response.status(400).json({
        error: invalidProfessorFiltersError,
      });
    }

    const professors = await listProfessors(parsedFilters.data);

    return response.status(200).json(professors);
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

  app.post("/professors/:id/reviews", async (request, response) => {
    const parsedParams = professorIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      return response.status(400).json({
        error: invalidProfessorIdError,
      });
    }

    const parsedBody = createReviewBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      return response.status(400).json({
        error: invalidReviewInputError,
      });
    }

    const professor = await findProfessorById(parsedParams.data.id);

    if (professor === undefined) {
      return response.status(404).json({
        error: professorNotFoundError,
      });
    }

    const review = await createReview({
      professorId: parsedParams.data.id,
      rating: parsedBody.data.rating,
      comment: parsedBody.data.comment,
    });

    return response.status(201).json(review);
  });

  app.delete(
    "/professors/:professorId/reviews/:reviewId",
    async (request, response) => {
      const parsedProfessorId = professorIdParamsSchema.safeParse({
        id: request.params.professorId,
      });

      if (!parsedProfessorId.success) {
        return response.status(400).json({
          error: invalidProfessorIdError,
        });
      }

      const parsedReviewId = reviewIdParamsSchema.safeParse({
        reviewId: request.params.reviewId,
      });

      if (!parsedReviewId.success) {
        return response.status(400).json({
          error: invalidReviewIdError,
        });
      }

      const professor = await findProfessorById(parsedProfessorId.data.id);

      if (professor === undefined) {
        return response.status(404).json({
          error: professorNotFoundError,
        });
      }

      const deletedReview = await deleteReview({
        professorId: parsedProfessorId.data.id,
        reviewId: parsedReviewId.data.reviewId,
      });

      if (deletedReview === undefined) {
        return response.status(404).json({
          error: reviewNotFoundError,
        });
      }

      return response.status(204).send();
    },
  );

  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      next: NextFunction,
    ) => {
      if (isJsonParsingError(error)) {
        return response.status(400).json({ error: invalidJsonBodyError });
      }

      return next(error);
    },
  );

  return app;
}
