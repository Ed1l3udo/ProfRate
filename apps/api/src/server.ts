import { createApp } from "./app.js";
import { db } from "./db/client.js";
import { createPasswordService } from "./modules/auth/password.js";
import { createTokenService } from "./modules/auth/token.js";
import { createCoursesRepository } from "./modules/courses/repository.js";
import { createDepartmentsRepository } from "./modules/departments/repository.js";
import { createDisciplinesRepository } from "./modules/disciplines/repository.js";
import { createProfessorsRepository } from "./modules/professors/repository.js";
import { createReviewsRepository } from "./modules/reviews/repository.js";
import { createUsersRepository } from "./modules/users/repository.js";

const port = Number(process.env.PORT ?? 3000);
const authJwtSecret = process.env.AUTH_JWT_SECRET;

if (!authJwtSecret) {
  throw new Error("AUTH_JWT_SECRET must be configured.");
}

const professorsRepository = createProfessorsRepository(db);
const reviewsRepository = createReviewsRepository(db);
const departmentsRepository = createDepartmentsRepository(db);
const coursesRepository = createCoursesRepository(db);
const disciplinesRepository = createDisciplinesRepository(db);
const usersRepository = createUsersRepository(db);
const passwordService = createPasswordService();
const tokenService = createTokenService(authJwtSecret);
const app = createApp({
  ...professorsRepository,
  ...reviewsRepository,
  ...departmentsRepository,
  ...coursesRepository,
  ...disciplinesRepository,
  ...usersRepository,
  ...passwordService,
  ...tokenService,
});

app.listen(port, () => {
  console.log(`API available at http://localhost:${port}`);
});
