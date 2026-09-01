import { createApp } from "./app.js";
import { db } from "./db/client.js";
import { createProfessorsRepository } from "./modules/professors/repository.js";
import { createReviewsRepository } from "./modules/reviews/repository.js";

const port = Number(process.env.PORT ?? 3000);
const professorsRepository = createProfessorsRepository(db);
const reviewsRepository = createReviewsRepository(db);
const app = createApp({
  ...professorsRepository,
  ...reviewsRepository,
});

app.listen(port, () => {
  console.log(`API available at http://localhost:${port}`);
});
