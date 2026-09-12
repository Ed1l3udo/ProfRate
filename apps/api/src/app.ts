import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import {
  authenticatedUser,
  createAuthenticationMiddleware,
  userBlockedError,
} from "./modules/auth/middleware.js";
import {
  DUMMY_PASSWORD_HASH,
  type PasswordService,
} from "./modules/auth/password.js";
import {
  courseNotFoundError,
  emailAlreadyRegisteredError,
  invalidCredentialsError,
  invalidLoginInputError,
  invalidProfileUpdateError,
  invalidSignupInputError,
  loginBodySchema,
  signupBodySchema,
  updateProfileBodySchema,
} from "./modules/auth/schemas.js";
import type { TokenService } from "./modules/auth/token.js";
import type { CoursesRepository } from "./modules/courses/repository.js";
import {
  courseFiltersSchema,
  invalidCourseFiltersError,
} from "./modules/courses/schemas.js";
import type { DepartmentsRepository } from "./modules/departments/repository.js";
import type { DisciplinesRepository } from "./modules/disciplines/repository.js";
import {
  disciplineFiltersSchema,
  disciplineIdParamsSchema,
  disciplineNotFoundError,
  invalidDisciplineFiltersError,
  invalidDisciplineIdError,
} from "./modules/disciplines/schemas.js";
import {
  invalidProfessorIdError,
  invalidProfessorFiltersError,
  professorFiltersSchema,
  professorIdParamsSchema,
  professorNotFoundError,
} from "./modules/professors/schemas.js";
import type { ProfessorsRepository } from "./modules/professors/repository.js";
import {
  invalidReviewIdError,
  invalidJsonBodyError,
  invalidReviewInputError,
  invalidReviewUpdateError,
  createReviewBodySchema,
  reviewIdParamsSchema,
  reviewNotFoundError,
  reviewNotOwnedError,
  updateReviewBodySchema,
} from "./modules/reviews/schemas.js";
import type { ReviewsRepository } from "./modules/reviews/repository.js";
import {
  publicUser,
  type UsersRepository,
} from "./modules/users/repository.js";

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
  updateReview,
  findDisciplineById = async () => undefined,
  listCourses = async () => [],
  listDepartments = async () => [],
  listDisciplines = async () => [],
  createStudent = async () => undefined,
  findCourseById = async () => undefined,
  findReviewOwnership = async () => undefined,
  findUserByEmail = async () => undefined,
  findUserById = async () => undefined,
  hashPassword = async () => "",
  listReviewsByAuthorId = async () => [],
  signToken = async () => "",
  updateProfile = async () => undefined,
  verifyPassword = async () => false,
  verifyToken = async () => {
    throw new Error("Token service is not configured.");
  },
}: {
  createReview: ReviewsRepository["createReview"];
  findProfessorById: ProfessorsRepository["findProfessorById"];
  listProfessors: ProfessorsRepository["listProfessors"];
  listReviewsByProfessorId: ReviewsRepository["listReviewsByProfessorId"];
  deleteReview: ReviewsRepository["deleteReview"];
  updateReview: ReviewsRepository["updateReview"];
  findDisciplineById?: DisciplinesRepository["findDisciplineById"];
  listCourses?: CoursesRepository["listCourses"];
  listDepartments?: DepartmentsRepository["listDepartments"];
  listDisciplines?: DisciplinesRepository["listDisciplines"];
  createStudent?: UsersRepository["createStudent"];
  findCourseById?: CoursesRepository["findCourseById"];
  findReviewOwnership?: ReviewsRepository["findReviewOwnership"];
  findUserByEmail?: UsersRepository["findUserByEmail"];
  findUserById?: UsersRepository["findUserById"];
  hashPassword?: PasswordService["hashPassword"];
  listReviewsByAuthorId?: ReviewsRepository["listReviewsByAuthorId"];
  signToken?: TokenService["signToken"];
  updateProfile?: UsersRepository["updateProfile"];
  verifyPassword?: PasswordService["verifyPassword"];
  verifyToken?: TokenService["verifyToken"];
}) {
  const app = express();
  const {
    optionalAuthentication,
    requireAuthentication,
    requireStudent,
  } = createAuthenticationMiddleware({ findUserById, verifyToken });

  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.post("/auth/signup", async (request, response) => {
    const parsedBody = signupBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      return response.status(400).json({ error: invalidSignupInputError });
    }

    const course = await findCourseById(parsedBody.data.courseId);
    if (course === undefined) {
      return response.status(404).json({ error: courseNotFoundError });
    }

    const passwordHash = await hashPassword(parsedBody.data.password);
    const user = await createStudent({
      name: parsedBody.data.name,
      email: parsedBody.data.email,
      passwordHash,
      courseId: parsedBody.data.courseId,
    });

    if (user === undefined) {
      return response.status(409).json({ error: emailAlreadyRegisteredError });
    }

    const token = await signToken({ userId: user.id, role: user.role });
    return response.status(201).json({ user: publicUser(user), token });
  });

  app.post("/auth/login", async (request, response) => {
    const parsedBody = loginBodySchema.safeParse(request.body);

    if (!parsedBody.success) {
      return response.status(400).json({ error: invalidLoginInputError });
    }

    const user = await findUserByEmail(parsedBody.data.email);
    const passwordMatches = await verifyPassword(
      parsedBody.data.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (user === undefined || !passwordMatches) {
      return response.status(401).json({ error: invalidCredentialsError });
    }

    if (!user.active) {
      return response.status(403).json({ error: userBlockedError });
    }

    const token = await signToken({ userId: user.id, role: user.role });
    return response.status(200).json({ user: publicUser(user), token });
  });

  app.get("/me", requireAuthentication, (_request, response) => {
    return response.status(200).json(publicUser(authenticatedUser(response)));
  });

  app.patch("/me", requireAuthentication, async (request, response) => {
    const parsedBody = updateProfileBodySchema.safeParse(request.body);
    const user = authenticatedUser(response);

    if (!parsedBody.success || (user.role === "moderator" && parsedBody.data.courseId !== undefined)) {
      return response.status(400).json({ error: invalidProfileUpdateError });
    }

    if (parsedBody.data.courseId !== undefined) {
      const course = await findCourseById(parsedBody.data.courseId);
      if (course === undefined) {
        return response.status(404).json({ error: courseNotFoundError });
      }
    }

    const updatedUser = await updateProfile({ id: user.id, ...parsedBody.data });
    if (updatedUser === undefined) {
      return response.status(401).json({ error: invalidCredentialsError });
    }

    return response.status(200).json(publicUser(updatedUser));
  });

  app.get(
    "/me/reviews",
    requireAuthentication,
    requireStudent,
    async (_request, response) => {
      const user = authenticatedUser(response);
      const reviews = await listReviewsByAuthorId(user.id);
      return response.status(200).json(reviews);
    },
  );

  app.get("/departments", async (_request, response) => {
    const departments = await listDepartments();

    return response.status(200).json(departments);
  });

  app.get("/courses", async (request, response) => {
    const parsedFilters = courseFiltersSchema.safeParse(request.query);

    if (!parsedFilters.success) {
      return response.status(400).json({ error: invalidCourseFiltersError });
    }

    const courses = await listCourses(parsedFilters.data);

    return response.status(200).json(courses);
  });

  app.get("/disciplines", async (request, response) => {
    const parsedFilters = disciplineFiltersSchema.safeParse(request.query);

    if (!parsedFilters.success) {
      return response.status(400).json({ error: invalidDisciplineFiltersError });
    }

    const disciplines = await listDisciplines(parsedFilters.data);

    return response.status(200).json(disciplines);
  });

  app.get("/disciplines/:id", async (request, response) => {
    const parsedParams = disciplineIdParamsSchema.safeParse(request.params);

    if (!parsedParams.success) {
      return response.status(400).json({ error: invalidDisciplineIdError });
    }

    const discipline = await findDisciplineById(parsedParams.data.id);

    if (discipline === undefined) {
      return response.status(404).json({ error: disciplineNotFoundError });
    }

    return response.status(200).json(discipline);
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

  app.get(
    "/professors/:id/reviews",
    optionalAuthentication,
    async (request, response) => {
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

    const viewer = response.locals.authUser as
      | ReturnType<typeof authenticatedUser>
      | undefined;
    const reviews = viewer?.role === "student"
      ? await listReviewsByProfessorId(parsedParams.data.id, viewer.id)
      : await listReviewsByProfessorId(parsedParams.data.id);

    return response.status(200).json(reviews);
    },
  );

  app.post(
    "/professors/:id/reviews",
    requireAuthentication,
    requireStudent,
    async (request, response) => {
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
      authorId: authenticatedUser(response).id,
    });

    return response.status(201).json(review);
    },
  );

  app.delete(
    "/professors/:professorId/reviews/:reviewId",
    requireAuthentication,
    requireStudent,
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

      const ownership = await findReviewOwnership({
        professorId: parsedProfessorId.data.id,
        reviewId: parsedReviewId.data.reviewId,
      });

      if (ownership === undefined) {
        return response.status(404).json({
          error: reviewNotFoundError,
        });
      }

      const user = authenticatedUser(response);
      if (ownership.authorId !== user.id) {
        return response.status(403).json({ error: reviewNotOwnedError });
      }

      const deletedReview = await deleteReview({
        professorId: parsedProfessorId.data.id,
        reviewId: parsedReviewId.data.reviewId,
        authorId: user.id,
      });

      if (deletedReview === undefined) {
        return response.status(404).json({ error: reviewNotFoundError });
      }

      return response.status(204).send();
    },
  );

  app.patch(
    "/professors/:professorId/reviews/:reviewId",
    requireAuthentication,
    requireStudent,
    async (request, response) => {
      const parsedProfessorId = professorIdParamsSchema.safeParse({
        id: request.params.professorId,
      });

      if (!parsedProfessorId.success) {
        return response.status(400).json({ error: invalidProfessorIdError });
      }

      const parsedReviewId = reviewIdParamsSchema.safeParse({
        reviewId: request.params.reviewId,
      });

      if (!parsedReviewId.success) {
        return response.status(400).json({ error: invalidReviewIdError });
      }

      const parsedBody = updateReviewBodySchema.safeParse(request.body);

      if (!parsedBody.success) {
        return response.status(400).json({ error: invalidReviewUpdateError });
      }

      const professor = await findProfessorById(parsedProfessorId.data.id);

      if (professor === undefined) {
        return response.status(404).json({ error: professorNotFoundError });
      }

      const ownership = await findReviewOwnership({
        professorId: parsedProfessorId.data.id,
        reviewId: parsedReviewId.data.reviewId,
      });

      if (ownership === undefined) {
        return response.status(404).json({ error: reviewNotFoundError });
      }

      const user = authenticatedUser(response);
      if (ownership.authorId !== user.id) {
        return response.status(403).json({ error: reviewNotOwnedError });
      }

      const updatedReview = await updateReview({
        professorId: parsedProfessorId.data.id,
        reviewId: parsedReviewId.data.reviewId,
        authorId: user.id,
        ...parsedBody.data,
      });

      if (updatedReview === undefined) {
        return response.status(404).json({ error: reviewNotFoundError });
      }

      return response.status(200).json(updatedReview);
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
