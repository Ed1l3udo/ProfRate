import request from "supertest";
import { expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { getIntegrationContext } from "./database.js";

function app() {
  const context = getIntegrationContext();
  return createApp({
    ...context.coursesRepository, ...context.departmentsRepository, ...context.disciplinesRepository,
    ...context.professorsRepository, ...context.reviewsRepository, ...context.reportsRepository,
    ...context.moderationRepository, ...context.usersRepository, ...context.passwordService, ...context.tokenService,
    adminRepository: context.adminRepository,
    listModerationReviews: context.moderationRepository.listReviews,
    listModerationUsers: context.moderationRepository.listUsers,
  });
}
async function auth(userId: number, role: "student" | "moderator" | "admin") {
  return `Bearer ${await getIntegrationContext().tokenService.signToken({ userId, role })}`;
}

it("authorizes only admins and performs atomic catalog CRUD", async () => {
  const server = app(); const admin = await auth(4, "admin"); const student = await auth(1, "student"); const moderator = await auth(3, "moderator");
  await expect(request(server).get("/admin/departments").set("Authorization", student)).resolves.toMatchObject({ status: 403 });
  await expect(request(server).get("/admin/departments").set("Authorization", moderator)).resolves.toMatchObject({ status: 403 });

  const department = await request(server).post("/admin/departments").set("Authorization", admin).send({ name: "Departamento Administrativo" });
  expect(department.status).toBe(201);
  const course = await request(server).post("/admin/courses").set("Authorization", admin).send({ name: "Curso Administrativo", departmentId: department.body.id });
  expect(course.status).toBe(201);
  const discipline = await request(server).post("/admin/disciplines").set("Authorization", admin).send({ code: "ADM101", name: "Disciplina Administrativa", departmentId: department.body.id, workloadHours: 40, courseIds: [course.body.id] });
  expect(discipline.status).toBe(201);
  const professor = await request(server).post("/admin/professors").set("Authorization", admin).send({ name: "Professor Administrativo", departmentId: department.body.id, disciplineIds: [discipline.body.id] });
  expect(professor.status).toBe(201);

  const publicDisciplines = await request(server).get("/disciplines?search=adm101");
  expect(publicDisciplines.body.items).toContainEqual(expect.objectContaining({ id: discipline.body.id, courses: [{ id: course.body.id, name: "Curso Administrativo" }] }));
  const invalidUpdate = await request(server).patch(`/admin/disciplines/${discipline.body.id}`).set("Authorization", admin).send({ code: "ADM102", name: "Inválida", departmentId: department.body.id, workloadHours: 40, courseIds: [999] });
  expect(invalidUpdate.status).toBe(404);
  const unchanged = await request(server).get("/admin/disciplines").set("Authorization", admin);
  expect(unchanged.body).toContainEqual(expect.objectContaining({ id: discipline.body.id, code: "ADM101" }));

  const inUse = await request(server).delete(`/admin/disciplines/${discipline.body.id}`).set("Authorization", admin);
  expect(inUse.status).toBe(409);
  expect(inUse.body.error.code).toBe("ADMIN_RESOURCE_IN_USE");
  expect((await request(server).delete(`/admin/professors/${professor.body.id}`).set("Authorization", admin)).status).toBe(409);
  const updateProfessor = await request(server).patch(`/admin/professors/${professor.body.id}`).set("Authorization", admin).send({ name: "Professor Administrativo", departmentId: department.body.id, disciplineIds: [] });
  expect(updateProfessor.status).toBe(200);
  expect((await request(server).delete(`/admin/professors/${professor.body.id}`).set("Authorization", admin)).status).toBe(204);
  const updateDiscipline = await request(server).patch(`/admin/disciplines/${discipline.body.id}`).set("Authorization", admin).send({ code: "ADM101", name: "Disciplina Administrativa", departmentId: department.body.id, workloadHours: 40, courseIds: [] });
  expect(updateDiscipline.status).toBe(200);
  expect((await request(server).delete(`/admin/disciplines/${discipline.body.id}`).set("Authorization", admin)).status).toBe(204);
  expect((await request(server).delete(`/admin/courses/${course.body.id}`).set("Authorization", admin)).status).toBe(204);
  expect((await request(server).delete(`/admin/departments/${department.body.id}`).set("Authorization", admin)).status).toBe(204);
});

it("rejects invalid and duplicate administrative bodies", async () => {
  const server = app(); const admin = await auth(4, "admin");
  const invalid = await request(server).post("/admin/disciplines").set("Authorization", admin).send({ code: "bad", name: "X", departmentId: 1, workloadHours: 0, courseIds: [1, 1], extra: true });
  expect(invalid.status).toBe(400);
  const duplicate = await request(server).post("/admin/departments").set("Authorization", admin).send({ name: "Departamento Alfa" });
  expect(duplicate.status).toBe(409);
});
