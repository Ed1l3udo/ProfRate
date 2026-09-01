import request from "supertest";
import { expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { getIntegrationContext } from "./database.js";

it("persists the essential review lifecycle through the HTTP API", async () => {
  const { professorsRepository, reviewsRepository } = getIntegrationContext();
  const app = createApp({
    ...professorsRepository,
    ...reviewsRepository,
  });

  const professorsResponse = await request(app).get("/professors");

  expect(professorsResponse.status).toBe(200);
  expect(professorsResponse.body).toStrictEqual([
    { id: 1, name: "Alice Teste", department: "Departamento Alfa" },
    { id: 2, name: "Bruno Teste", department: "Departamento Beta" },
    { id: 3, name: "Carla Teste", department: "Departamento Gama" },
  ]);

  const createResponse = await request(app)
    .post("/professors/1/reviews")
    .send({ rating: 2, comment: "  Avaliação do fluxo HTTP.  " });

  expect(createResponse.status).toBe(201);
  expect(createResponse.body).toStrictEqual({
    id: 4,
    professorId: 1,
    rating: 2,
    comment: "Avaliação do fluxo HTTP.",
  });

  const afterCreateResponse = await request(app).get(
    "/professors/1/reviews",
  );

  expect(afterCreateResponse.status).toBe(200);
  expect(afterCreateResponse.body).toContainEqual(createResponse.body);

  const updateResponse = await request(app)
    .patch(`/professors/1/reviews/${createResponse.body.id}`)
    .send({ rating: 5, comment: "  Avaliação atualizada.  " });

  expect(updateResponse.status).toBe(200);
  expect(updateResponse.body).toStrictEqual({
    id: 4,
    professorId: 1,
    rating: 5,
    comment: "Avaliação atualizada.",
  });

  const afterUpdateResponse = await request(app).get(
    "/professors/1/reviews",
  );

  expect(afterUpdateResponse.status).toBe(200);
  expect(afterUpdateResponse.body).toContainEqual(updateResponse.body);
  expect(afterUpdateResponse.body).not.toContainEqual(createResponse.body);

  const deleteResponse = await request(app).delete(
    `/professors/1/reviews/${createResponse.body.id}`,
  );

  expect(deleteResponse.status).toBe(204);
  expect(deleteResponse.text).toBe("");

  const afterDeleteResponse = await request(app).get(
    "/professors/1/reviews",
  );

  expect(afterDeleteResponse.status).toBe(200);
  expect(afterDeleteResponse.body).not.toContainEqual(updateResponse.body);
  expect(afterDeleteResponse.body).toHaveLength(2);
});
