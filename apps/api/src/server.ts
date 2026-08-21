import { createApp } from "./app.js";
import {
  findProfessorById,
  listProfessors,
} from "./modules/professors/repository.js";
import { listReviewsByProfessorId } from "./modules/reviews/repository.js";

const port = Number(process.env.PORT ?? 3000);
const app = createApp({
  findProfessorById,
  listProfessors,
  listReviewsByProfessorId,
});

app.listen(port, () => {
  console.log(`API available at http://localhost:${port}`);
});
