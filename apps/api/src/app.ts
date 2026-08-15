import express from "express";
import type { listProfessors as listProfessorsRepository } from "./modules/professors/repository.js";

export function createApp({
  listProfessors,
}: {
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

  return app;
}
