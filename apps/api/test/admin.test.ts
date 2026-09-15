import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";

const createdAt = new Date("2026-09-15T12:00:00.000Z");
const baseUser = {
  id: 1, name: "Usuário", email: "usuario@profrate.test", passwordHash: "hash", role: "student" as const,
  courseId: null, course: null, active: true, createdAt, updatedAt: createdAt,
};

function adminRepository() {
  return {
    listAdminDepartments: vi.fn().mockResolvedValue([]), listAdminCourses: vi.fn().mockResolvedValue([]),
    listAdminDisciplines: vi.fn().mockResolvedValue([]), listAdminProfessors: vi.fn().mockResolvedValue([]),
    createDepartment: vi.fn().mockResolvedValue({ id: 10, name: "Departamento Novo" }), updateDepartment: vi.fn(), deleteDepartment: vi.fn(),
    createCourse: vi.fn(), updateCourse: vi.fn(), deleteCourse: vi.fn(), createDiscipline: vi.fn(), updateDiscipline: vi.fn(), deleteDiscipline: vi.fn(),
    createProfessor: vi.fn(), updateProfessor: vi.fn(), deleteProfessor: vi.fn(),
  };
}

function appFor(role: "student" | "moderator" | "admin", repository = adminRepository()) {
  const user = { ...baseUser, role };
  return {
    repository,
    app: createApp({
      createReview: async () => ({}), deleteReview: async () => undefined, updateReview: async () => undefined,
      findProfessorById: async () => undefined, findReviewOwnership: async () => undefined,
      listProfessors: async () => [], listReviewsByProfessorId: async () => [], listReviewsByAuthorId: async () => [],
      findUserById: async () => user, verifyToken: async () => ({ userId: user.id, role }), adminRepository: repository,
    }),
  };
}

const authorization = { Authorization: "Bearer valid-token" };

describe("administrative API", () => {
  it.each(["student", "moderator"] as const)("denies %s before calling the administrative repository", async (role) => {
    const { app, repository } = appFor(role);
    const response = await request(app).get("/admin/departments").set(authorization);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ADMIN_REQUIRED");
    expect(repository.listAdminDepartments).not.toHaveBeenCalled();
  });

  it("requires authentication and accepts an admin", async () => {
    const { app, repository } = appFor("admin");
    expect((await request(app).get("/admin/departments")).status).toBe(401);
    expect((await request(app).get("/admin/departments").set(authorization)).status).toBe(200);
    expect(repository.listAdminDepartments).toHaveBeenCalledOnce();
  });

  it("validates route IDs and strict bodies before calling a repository", async () => {
    const { app, repository } = appFor("admin");
    const invalidId = await request(app).patch("/admin/departments/0").set(authorization).send({ name: "Válido" });
    const invalidBody = await request(app).post("/admin/disciplines").set(authorization).send({ code: "abc123", name: "X", departmentId: 1, workloadHours: 20, courseIds: [1, 1], extra: true });
    expect(invalidId.body.error.code).toBe("INVALID_ADMIN_INPUT");
    expect(invalidBody.body.error.code).toBe("INVALID_ADMIN_INPUT");
    expect(repository.updateDepartment).not.toHaveBeenCalled();
    expect(repository.createDiscipline).not.toHaveBeenCalled();
  });

  it("normalizes discipline data, maps repository outcomes, and returns 204", async () => {
    const { app, repository } = appFor("admin");
    repository.createDiscipline.mockResolvedValue({ id: 4, code: "ABC123", name: "Disciplina", workloadHours: 32, department: { id: 1, name: "Departamento" }, courses: [] });
    repository.deleteDepartment.mockResolvedValueOnce("in-use").mockResolvedValueOnce("deleted");
    const created = await request(app).post("/admin/disciplines").set(authorization).send({ code: " abc123 ", name: " Disciplina ", departmentId: 1, workloadHours: 32, courseIds: [] });
    const inUse = await request(app).delete("/admin/departments/1").set(authorization);
    const deleted = await request(app).delete("/admin/departments/2").set(authorization);
    expect(created.status).toBe(201);
    expect(repository.createDiscipline).toHaveBeenCalledWith({ code: "ABC123", name: "Disciplina", departmentId: 1, workloadHours: 32, courseIds: [] });
    expect(inUse.body.error.code).toBe("ADMIN_RESOURCE_IN_USE");
    expect(deleted.status).toBe(204);
  });
});
