import { createApp } from "./app.js";
import { db } from "./db/client.js";
import { createPasswordService } from "./modules/auth/password.js";
import { createAuthSecurityRepository } from "./modules/auth/security-repository.js";
import { createTokenService } from "./modules/auth/token.js";
import { createCoursesRepository } from "./modules/courses/repository.js";
import { createDepartmentsRepository } from "./modules/departments/repository.js";
import { createDisciplinesRepository } from "./modules/disciplines/repository.js";
import { createProfessorsRepository } from "./modules/professors/repository.js";
import { createReviewsRepository } from "./modules/reviews/repository.js";
import { createReportsRepository } from "./modules/reports/repository.js";
import { createModerationRepository } from "./modules/moderation/repository.js";
import { createAdminRepository } from "./modules/admin/repository.js";
import { createDiscoveryRepository } from "./modules/discovery/repository.js";
import { createUsersRepository } from "./modules/users/repository.js";

const port = Number(process.env.PORT ?? 3000);
const authJwtSecret = process.env.AUTH_JWT_SECRET;

if (!authJwtSecret) {
  throw new Error("AUTH_JWT_SECRET must be configured.");
}

const professorsRepository = createProfessorsRepository(db);
const reviewsRepository = createReviewsRepository(db);
const reportsRepository = createReportsRepository(db);
const moderationRepository = createModerationRepository(db);
const adminRepository = createAdminRepository(db);
const discoveryRepository = createDiscoveryRepository(db);
const departmentsRepository = createDepartmentsRepository(db);
const coursesRepository = createCoursesRepository(db);
const disciplinesRepository = createDisciplinesRepository(db);
const usersRepository = createUsersRepository(db);
const passwordService = createPasswordService();
const authSecurityRepository = createAuthSecurityRepository(db);
const tokenService = createTokenService(authJwtSecret);
const app = createApp({
  ...professorsRepository,
  ...reviewsRepository,
  ...reportsRepository,
  ...moderationRepository,
  adminRepository,
  discoveryRepository,
  listModerationReviews: moderationRepository.listReviews,
  listModerationUsers: moderationRepository.listUsers,
  listModerationLogs: moderationRepository.listLogs,
  ...departmentsRepository,
  ...coursesRepository,
  ...disciplinesRepository,
  ...usersRepository,
  ...passwordService,
  authSecurityRepository,
  ...tokenService,
});

app.listen(port, () => {
  console.log(`API available at http://localhost:${port}`);
});
