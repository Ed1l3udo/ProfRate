import request from "supertest";
import { expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { getIntegrationContext, reviewFixtureTimestamp } from "./database.js";

const isoUtcTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

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
    createdAt: expect.stringMatching(isoUtcTimestamp),
    updatedAt: expect.stringMatching(isoUtcTimestamp),
  });
  expect(createResponse.body.updatedAt).toBe(createResponse.body.createdAt);

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
    createdAt: createResponse.body.createdAt,
    updatedAt: expect.stringMatching(isoUtcTimestamp),
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

it("preserves creation and advances the fixed fixture timestamp on PATCH", async () => {
  const { professorsRepository, reviewsRepository } = getIntegrationContext();
  const app = createApp({ ...professorsRepository, ...reviewsRepository });
  const response = await request(app)
    .patch("/professors/1/reviews/1")
    .send({ comment: "Fixture editada pelo HTTP." });

  expect(response.status).toBe(200);
  expect(response.body.createdAt).toBe(reviewFixtureTimestamp.toISOString());
  expect(response.body.updatedAt).toMatch(isoUtcTimestamp);
  expect(Date.parse(response.body.updatedAt)).toBeGreaterThan(reviewFixtureTimestamp.getTime());

  const listResponse = await request(app).get("/professors/1/reviews");
  expect(listResponse.status).toBe(200);
  expect(listResponse.body).toContainEqual(response.body);
});

it("enforces the 500-code-point comment limit through POST and PATCH", async () => {
  const { professorsRepository, reviewsRepository } = getIntegrationContext();
  const app = createApp({ ...professorsRepository, ...reviewsRepository });
  const emojiComment = "🙂".repeat(500);
  const createResponse = await request(app)
    .post("/professors/1/reviews")
    .send({ rating: 5, comment: emojiComment });

  expect(createResponse.status).toBe(201);
  expect(Array.from(createResponse.body.comment)).toHaveLength(500);

  const rejectedCreateResponse = await request(app)
    .post("/professors/1/reviews")
    .send({ rating: 5, comment: "a".repeat(501) });

  expect(rejectedCreateResponse.status).toBe(400);
  expect(rejectedCreateResponse.body.error.code).toBe("INVALID_REVIEW_INPUT");

  const updateResponse = await request(app)
    .patch(`/professors/1/reviews/${createResponse.body.id}`)
    .send({ comment: "a".repeat(500) });

  expect(updateResponse.status).toBe(200);
  expect(Array.from(updateResponse.body.comment)).toHaveLength(500);

  const rejectedUpdateResponse = await request(app)
    .patch(`/professors/1/reviews/${createResponse.body.id}`)
    .send({ comment: "🙂".repeat(501) });

  expect(rejectedUpdateResponse.status).toBe(400);
  expect(rejectedUpdateResponse.body.error.code).toBe("INVALID_REVIEW_UPDATE");
});
