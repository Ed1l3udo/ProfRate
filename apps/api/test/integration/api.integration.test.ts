import request from "supertest";
import { expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { createApp } from "../../src/app.js";
import { reviews, users } from "../../src/db/schema.js";
import { getIntegrationContext, reviewFixtureTimestamp } from "./database.js";

const isoUtcTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function createIntegrationApp() {
  const {
    coursesRepository,
    departmentsRepository,
    disciplinesRepository,
    passwordService,
    professorsRepository,
    reviewsRepository,
    tokenService,
    usersRepository,
  } = getIntegrationContext();

  return createApp({
    ...coursesRepository,
    ...departmentsRepository,
    ...disciplinesRepository,
    ...passwordService,
    ...professorsRepository,
    ...reviewsRepository,
    ...tokenService,
    ...usersRepository,
  });
}

async function studentAuthorization(userId = 1) {
  const token = await getIntegrationContext().tokenService.signToken({
    userId,
    role: "student",
  });
  return `Bearer ${token}`;
}

it("persists the essential review lifecycle through the HTTP API", async () => {
  const app = createIntegrationApp();
  const authorization = await studentAuthorization();

  const professorsResponse = await request(app).get("/professors");

  expect(professorsResponse.status).toBe(200);
  expect(professorsResponse.body).toStrictEqual([
    {
      id: 1,
      name: "Alice Teste",
      department: "Departamento Alfa",
      reviewCount: 2,
      averageRating: 4.5,
    },
    {
      id: 2,
      name: "Bruno Teste",
      department: "Departamento Beta",
      reviewCount: 1,
      averageRating: 3,
    },
    {
      id: 3,
      name: "Carla Teste",
      department: "Departamento Gama",
      reviewCount: 0,
      averageRating: null,
    },
  ]);

  const createResponse = await request(app)
    .post("/professors/1/reviews")
    .set("Authorization", authorization)
    .send({ rating: 2, comment: "  Avaliação do fluxo HTTP.  " });

  expect(createResponse.status).toBe(201);
  expect(createResponse.body).toStrictEqual({
    id: 4,
    professorId: 1,
    rating: 2,
    comment: "Avaliação do fluxo HTTP.",
    createdAt: expect.stringMatching(isoUtcTimestamp),
    updatedAt: expect.stringMatching(isoUtcTimestamp),
    canManage: true,
  });
  expect(createResponse.body.updatedAt).toBe(createResponse.body.createdAt);

  const afterCreateResponse = await request(app)
    .get("/professors/1/reviews")
    .set("Authorization", authorization);

  expect(afterCreateResponse.status).toBe(200);
  expect(afterCreateResponse.body).toContainEqual(createResponse.body);

  const updateResponse = await request(app)
    .patch(`/professors/1/reviews/${createResponse.body.id}`)
    .set("Authorization", authorization)
    .send({ rating: 5, comment: "  Avaliação atualizada.  " });

  expect(updateResponse.status).toBe(200);
  expect(updateResponse.body).toStrictEqual({
    id: 4,
    professorId: 1,
    rating: 5,
    comment: "Avaliação atualizada.",
    createdAt: createResponse.body.createdAt,
    updatedAt: expect.stringMatching(isoUtcTimestamp),
    canManage: true,
  });

  const afterUpdateResponse = await request(app)
    .get("/professors/1/reviews")
    .set("Authorization", authorization);

  expect(afterUpdateResponse.status).toBe(200);
  expect(afterUpdateResponse.body).toContainEqual(updateResponse.body);
  expect(afterUpdateResponse.body).not.toContainEqual(createResponse.body);

  const deleteResponse = await request(app).delete(
    `/professors/1/reviews/${createResponse.body.id}`,
  ).set("Authorization", authorization);

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
  const app = createIntegrationApp();
  const authorization = await studentAuthorization();
  const response = await request(app)
    .patch("/professors/1/reviews/1")
    .set("Authorization", authorization)
    .send({ comment: "Fixture editada pelo HTTP." });

  expect(response.status).toBe(200);
  expect(response.body.createdAt).toBe(reviewFixtureTimestamp.toISOString());
  expect(response.body.updatedAt).toMatch(isoUtcTimestamp);
  expect(Date.parse(response.body.updatedAt)).toBeGreaterThan(reviewFixtureTimestamp.getTime());

  const listResponse = await request(app)
    .get("/professors/1/reviews")
    .set("Authorization", authorization);
  expect(listResponse.status).toBe(200);
  expect(listResponse.body).toContainEqual(response.body);
});

it("enforces the 500-code-point comment limit through POST and PATCH", async () => {
  const app = createIntegrationApp();
  const authorization = await studentAuthorization();
  const emojiComment = "🙂".repeat(500);
  const createResponse = await request(app)
    .post("/professors/1/reviews")
    .set("Authorization", authorization)
    .send({ rating: 5, comment: emojiComment });

  expect(createResponse.status).toBe(201);
  expect(Array.from(createResponse.body.comment)).toHaveLength(500);

  const rejectedCreateResponse = await request(app)
    .post("/professors/1/reviews")
    .set("Authorization", authorization)
    .send({ rating: 5, comment: "a".repeat(501) });

  expect(rejectedCreateResponse.status).toBe(400);
  expect(rejectedCreateResponse.body.error.code).toBe("INVALID_REVIEW_INPUT");

  const updateResponse = await request(app)
    .patch(`/professors/1/reviews/${createResponse.body.id}`)
    .set("Authorization", authorization)
    .send({ comment: "a".repeat(500) });

  expect(updateResponse.status).toBe(200);
  expect(Array.from(updateResponse.body.comment)).toHaveLength(500);

  const rejectedUpdateResponse = await request(app)
    .patch(`/professors/1/reviews/${createResponse.body.id}`)
    .set("Authorization", authorization)
    .send({ comment: "🙂".repeat(501) });

  expect(rejectedUpdateResponse.status).toBe(400);
  expect(rejectedUpdateResponse.body.error.code).toBe("INVALID_REVIEW_UPDATE");
});

it("serves the catalog through the HTTP API with real repositories", async () => {
  const app = createIntegrationApp();

  const departmentsResponse = await request(app).get("/departments");
  const coursesResponse = await request(app).get("/courses?departmentId=2");
  const disciplinesResponse = await request(app).get(
    "/disciplines?search=tst101&departmentId=1&courseId=2",
  );
  const detailsResponse = await request(app).get("/disciplines/1");

  expect(departmentsResponse.status).toBe(200);
  expect(departmentsResponse.body).toHaveLength(3);
  expect(coursesResponse.body).toStrictEqual([
    { id: 2, name: "Curso Beta", departmentId: 2, department: "Departamento Beta" },
  ]);
  expect(disciplinesResponse.status).toBe(200);
  expect(disciplinesResponse.body).toHaveLength(1);
  expect(detailsResponse.status).toBe(200);
  expect(detailsResponse.body.professors).toStrictEqual([
    { id: 1, name: "Alice Teste" },
    { id: 2, name: "Bruno Teste" },
  ]);
});

it("creates and logs in a real user while storing only a bcrypt hash", async () => {
  const { database, passwordService } = getIntegrationContext();
  const app = createIntegrationApp();
  const signupResponse = await request(app).post("/auth/signup").send({
    name: "  Nova Aluna  ",
    email: "  NOVA.ALUNA@PROFRATE.TEST  ",
    password: "Senha123",
    courseId: 1,
  });

  expect(signupResponse.status).toBe(201);
  expect(signupResponse.body.user).toMatchObject({
    name: "Nova Aluna",
    email: "nova.aluna@profrate.test",
    role: "student",
    course: { id: 1, name: "Curso Alfa" },
  });
  expect(signupResponse.text).not.toContain("passwordHash");

  const persisted = await database.pool.query<{
    password_hash: string;
    course_id: number;
  }>("SELECT password_hash, course_id FROM users WHERE email = $1", [
    "nova.aluna@profrate.test",
  ]);
  expect(persisted.rows[0].password_hash).not.toBe("Senha123");
  expect(await passwordService.verifyPassword("Senha123", persisted.rows[0].password_hash)).toBe(true);
  expect(persisted.rows[0].course_id).toBe(1);

  const loginResponse = await request(app).post("/auth/login").send({
    email: "nova.aluna@profrate.test",
    password: "Senha123",
  });
  expect(loginResponse.status).toBe(200);

  const meResponse = await request(app)
    .get("/me")
    .set("Authorization", `Bearer ${loginResponse.body.token}`);
  expect(meResponse.status).toBe(200);
  expect(meResponse.body.email).toBe("nova.aluna@profrate.test");
});

it("enforces review ownership and preserves public legacy reviews", async () => {
  const { database } = getIntegrationContext();
  const app = createIntegrationApp();
  const ownerAuthorization = await studentAuthorization(1);
  const otherAuthorization = await studentAuthorization(2);
  const createResponse = await request(app)
    .post("/professors/1/reviews")
    .set("Authorization", ownerAuthorization)
    .send({ rating: 4, comment: "Review autenticada de integração." });

  expect(createResponse.status).toBe(201);
  const reviewId = createResponse.body.id as number;

  const publicResponse = await request(app).get("/professors/1/reviews");
  const publicReview = publicResponse.body.find((review: { id: number }) => review.id === reviewId);
  expect(publicReview.canManage).toBe(false);
  expect(JSON.stringify(publicReview)).not.toContain("authorId");

  const forbiddenResponse = await request(app)
    .patch(`/professors/1/reviews/${reviewId}`)
    .set("Authorization", otherAuthorization)
    .send({ rating: 1 });
  expect(forbiddenResponse.status).toBe(403);
  expect(forbiddenResponse.body.error.code).toBe("REVIEW_NOT_OWNED");

  const unchanged = await database.pool.query<{ rating: number; author_id: number }>(
    "SELECT rating, author_id FROM reviews WHERE id = $1",
    [reviewId],
  );
  expect(unchanged.rows).toStrictEqual([{ rating: 4, author_id: 1 }]);

  const ownPatchResponse = await request(app)
    .patch(`/professors/1/reviews/${reviewId}`)
    .set("Authorization", ownerAuthorization)
    .send({ rating: 5 });
  expect(ownPatchResponse.status).toBe(200);
  expect(ownPatchResponse.body.canManage).toBe(true);

  const myReviewsResponse = await request(app)
    .get("/me/reviews")
    .set("Authorization", ownerAuthorization);
  expect(myReviewsResponse.body).toContainEqual(
    expect.objectContaining({ id: reviewId, professor: { id: 1, name: "Alice Teste" } }),
  );

  await database.db.insert(reviews).values({
    professorId: 1,
    authorId: null,
    rating: 3,
    comment: "Review legada sem autor.",
  });
  const legacyResponse = await request(app).get("/professors/1/reviews");
  expect(legacyResponse.body).toContainEqual(
    expect.objectContaining({ comment: "Review legada sem autor.", canManage: false }),
  );

  await database.db.delete(users).where(eq(users.id, 1));
  const afterUserDelete = await database.pool.query<{ author_id: number | null }>(
    "SELECT author_id FROM reviews WHERE id = $1",
    [reviewId],
  );
  expect(afterUserDelete.rows).toStrictEqual([{ author_id: null }]);
});
