import request from "supertest";
import { expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { getIntegrationContext } from "./database.js";

const professorRatings = (rating: number) => ({
  didactics: rating,
  clarity: rating,
  punctuality: rating,
  availability: rating,
});

function createIntegrationApp() {
  const context = getIntegrationContext();
  return createApp({
    ...context.coursesRepository,
    ...context.departmentsRepository,
    ...context.disciplinesRepository,
    ...context.passwordService,
    ...context.professorsRepository,
    ...context.reviewsRepository,
    ...context.reportsRepository,
    ...context.moderationRepository,
    listModerationReviews: context.moderationRepository.listReviews,
    listModerationUsers: context.moderationRepository.listUsers,
    ...context.tokenService,
    ...context.usersRepository,
  });
}

async function authorization(userId: number, role: "student" | "moderator") {
  const token = await getIntegrationContext().tokenService.signToken({ userId, role });
  return `Bearer ${token}`;
}

it("enforces the report contract and exposes report context only to moderators", async () => {
  const app = createIntegrationApp();
  const studentOne = await authorization(1, "student");
  const studentTwo = await authorization(2, "student");
  const moderator = await authorization(3, "moderator");

  const invalid = await request(app)
    .post("/reviews/3/reports")
    .set("Authorization", studentOne)
    .send({ reason: "   " });
  expect(invalid.status).toBe(400);
  expect(invalid.body.error.code).toBe("INVALID_REPORT_INPUT");

  const own = await request(app)
    .post("/reviews/1/reports")
    .set("Authorization", studentOne)
    .send({ reason: "É uma avaliação própria." });
  expect(own.status).toBe(403);
  expect(own.body.error.code).toBe("OWN_REVIEW_REPORT");

  const pending = await request(app)
    .post("/professors/1/reviews")
    .set("Authorization", studentOne)
    .send({ ratings: professorRatings(2), comment: "Avaliação pendente para moderação." });
  expect(pending.status).toBe(201);

  const notPublished = await request(app)
    .post(`/reviews/${pending.body.id}/reports`)
    .set("Authorization", studentTwo)
    .send({ reason: "Ainda não é pública." });
  expect(notPublished.status).toBe(404);
  expect(notPublished.body.error.code).toBe("REVIEW_NOT_REPORTABLE");

  const created = await request(app)
    .post("/reviews/3/reports")
    .set("Authorization", studentOne)
    .send({ reason: "  Contexto fictício para análise.  " });
  expect(created.status).toBe(201);
  expect(created.body.reason).toBe("Contexto fictício para análise.");

  const duplicate = await request(app)
    .post("/reviews/3/reports")
    .set("Authorization", studentOne)
    .send({ reason: "Tentativa duplicada." });
  expect(duplicate.status).toBe(409);
  expect(duplicate.body.error.code).toBe("DUPLICATE_REPORT");

  const studentList = await request(app)
    .get("/moderation/reports")
    .set("Authorization", studentOne);
  expect(studentList.status).toBe(403);
  expect(studentList.body.error.code).toBe("MODERATOR_REQUIRED");

  const list = await request(app)
    .get("/moderation/reports?status=pending")
    .set("Authorization", moderator);
  expect(list.status).toBe(200);
  expect(list.body).toContainEqual(expect.objectContaining({
    id: created.body.id,
    reporter: { id: 1, name: "Aluno Um", email: "aluno.um@profrate.test" },
    review: expect.objectContaining({ id: 3, comment: "Terceira avaliação de teste." }),
    professor: { id: 2, name: "Bruno Teste" },
    discipline: null,
  }));
  expect(list.body[0]).toHaveProperty("professor");
  expect(list.body[0]).toHaveProperty("discipline");

  const resolved = await request(app)
    .patch(`/moderation/reports/${created.body.id}`)
    .set("Authorization", moderator)
    .send({ status: "resolved" });
  expect(resolved.status).toBe(200);
  expect(resolved.body.status).toBe("resolved");

  const repeated = await request(app)
    .patch(`/moderation/reports/${created.body.id}`)
    .set("Authorization", moderator)
    .send({ status: "resolved" });
  expect(repeated.status).toBe(200);

  const conflicting = await request(app)
    .patch(`/moderation/reports/${created.body.id}`)
    .set("Authorization", moderator)
    .send({ status: "dismissed" });
  expect(conflicting.status).toBe(409);
  expect(conflicting.body.error.code).toBe("MODERATION_CONFLICT");
});

it("moderates review visibility and blocks only content writes", async () => {
  const app = createIntegrationApp();
  const studentOne = await authorization(1, "student");
  const studentTwo = await authorization(2, "student");
  const moderator = await authorization(3, "moderator");

  const pending = await request(app)
    .post("/professors/1/reviews")
    .set("Authorization", studentOne)
    .send({ ratings: professorRatings(4), comment: "Avaliação pronta para aprovação." });
  expect(pending.status).toBe(201);

  const pendingList = await request(app)
    .get("/moderation/reviews?status=pending")
    .set("Authorization", moderator);
  expect(pendingList.status).toBe(200);
  expect(pendingList.body).toContainEqual(expect.objectContaining({
    id: pending.body.id,
    author: { id: 1, name: "Aluno Um", email: "aluno.um@profrate.test" },
    professor: { id: 1, name: "Alice Teste" },
    didactics: 4,
    availability: 4,
  }));

  const approved = await request(app)
    .patch(`/moderation/reviews/${pending.body.id}`)
    .set("Authorization", moderator)
    .send({ status: "published" });
  expect(approved.status).toBe(200);
  expect(approved.body.status).toBe("published");

  const publicList = await request(app).get("/professors/1/reviews");
  expect(publicList.body).toContainEqual(expect.objectContaining({ id: pending.body.id, status: "published" }));
  const aggregate = await request(app).get("/professors");
  expect(aggregate.body.find((professor: { id: number }) => professor.id === 1)).toMatchObject({ reviewCount: 3, averageRating: expect.any(Number) });

  const removed = await request(app)
    .patch(`/moderation/reviews/${pending.body.id}`)
    .set("Authorization", moderator)
    .send({ status: "removed" });
  expect(removed.status).toBe(200);
  expect(removed.body.status).toBe("removed");

  const invalidTransition = await request(app)
    .patch(`/moderation/reviews/${pending.body.id}`)
    .set("Authorization", moderator)
    .send({ status: "published" });
  expect(invalidTransition.status).toBe(409);

  const usersBefore = await request(app)
    .get("/moderation/users?search=dois")
    .set("Authorization", moderator);
  expect(usersBefore.status).toBe(200);
  expect(usersBefore.body).toStrictEqual([expect.objectContaining({
    id: 2,
    email: "aluno.dois@profrate.test",
    course: { id: 2, name: "Curso Beta" },
  })]);
  expect(JSON.stringify(usersBefore.body)).not.toContain("passwordHash");

  const selfBlock = await request(app)
    .patch("/moderation/users/3/block")
    .set("Authorization", moderator);
  expect(selfBlock.status).toBe(409);
  expect(selfBlock.body.error.code).toBe("SELF_BLOCK_FORBIDDEN");

  const blocked = await request(app)
    .patch("/moderation/users/2/block")
    .set("Authorization", moderator);
  expect(blocked.status).toBe(200);
  expect(blocked.body.blocked).toBe(true);

  const blockedWrite = await request(app)
    .post("/professors/1/reviews")
    .set("Authorization", studentTwo)
    .send({ ratings: professorRatings(5), comment: "Esta escrita deve ser bloqueada." });
  expect(blockedWrite.status).toBe(403);
  expect(blockedWrite.body.error.code).toBe("USER_BLOCKED");

  const readWhileBlocked = await request(app)
    .get("/me/reviews")
    .set("Authorization", studentTwo);
  expect(readWhileBlocked.status).toBe(200);

  const unblocked = await request(app)
    .patch("/moderation/users/2/unblock")
    .set("Authorization", moderator);
  expect(unblocked.status).toBe(200);
  expect(unblocked.body.blocked).toBe(false);

  const writeAfterUnblock = await request(app)
    .post("/professors/1/reviews")
    .set("Authorization", studentTwo)
    .send({ ratings: professorRatings(5), comment: "A escrita voltou a ser permitida." });
  expect(writeAfterUnblock.status).toBe(201);
});
