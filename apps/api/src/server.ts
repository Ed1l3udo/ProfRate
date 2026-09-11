import { createApp } from "./app.js";
import { db } from "./db/client.js";
import { createCoursesRepository } from "./modules/courses/repository.js";
import { createDepartmentsRepository } from "./modules/departments/repository.js";
import { createDisciplinesRepository } from "./modules/disciplines/repository.js";
import { createProfessorsRepository } from "./modules/professors/repository.js";
import { createReviewsRepository } from "./modules/reviews/repository.js";

const port = Number(process.env.PORT ?? 3000);
const professorsRepository = createProfessorsRepository(db);
const reviewsRepository = createReviewsRepository(db);
const departmentsRepository = createDepartmentsRepository(db);
const coursesRepository = createCoursesRepository(db);
const disciplinesRepository = createDisciplinesRepository(db);
const app = createApp({
  ...professorsRepository,
  ...reviewsRepository,
  ...departmentsRepository,
  ...coursesRepository,
  ...disciplinesRepository,
});

app.listen(port, () => {
  console.log(`API available at http://localhost:${port}`);
});
