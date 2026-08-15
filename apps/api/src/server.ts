import { createApp } from "./app.js";
import { listProfessors } from "./modules/professors/repository.js";

const port = Number(process.env.PORT ?? 3000);
const app = createApp({ listProfessors });

app.listen(port, () => {
  console.log(`API available at http://localhost:${port}`);
});
