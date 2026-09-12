import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";

const currentDependencies = {
  createReview: async () => ({
    id: 1,
    professorId: 1,
    rating: 5,
    comment: "Teste",
    createdAt: new Date(),
    updatedAt: new Date(),
    canManage: true,
  }),
  deleteReview: async () => undefined,
  findProfessorById: async () => undefined,
  listProfessors: async () => [],
  listReviewsByProfessorId: async () => [],
  updateReview: async () => undefined,
};

describe("academic catalog endpoints", () => {
  it("returns departments from the injected repository", async () => {
    const departments = [{ id: 1, name: "Departamento Aurora" }];
    const listDepartments = vi.fn().mockResolvedValue(departments);
    const response = await request(createApp({ ...currentDependencies, listDepartments }))
      .get("/departments");

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(departments);
    expect(listDepartments).toHaveBeenCalledOnce();
  });

  it.each([
    ["without filters", "/courses", {}],
    ["with a department", "/courses?departmentId=2", { departmentId: 2 }],
  ])("lists courses %s and confirms repository arguments", async (_label, path, filters) => {
    const courses = [{ id: 1, name: "Computação Aplicada", departmentId: 1, department: "Departamento Aurora" }];
    const listCourses = vi.fn().mockResolvedValue(courses);
    const response = await request(createApp({ ...currentDependencies, listCourses })).get(path);

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(courses);
    expect(listCourses).toHaveBeenCalledWith(filters);
  });

  it.each(["0", "abc", "1.5"])("rejects invalid course departmentId %s", async (value) => {
    const listCourses = vi.fn();
    const response = await request(createApp({ ...currentDependencies, listCourses }))
      .get(`/courses?departmentId=${value}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_COURSE_FILTERS");
    expect(listCourses).not.toHaveBeenCalled();
  });

  it.each([
    ["without filters", "/disciplines", {}],
    [
      "with combined filters",
      "/disciplines?search=%20prog%20&departmentId=1&courseId=2",
      { search: "prog", departmentId: 1, courseId: 2 },
    ],
  ])("lists disciplines %s and confirms repository arguments", async (_label, path, filters) => {
    const disciplines = [
      {
        id: 1,
        code: "CMP101",
        name: "Fundamentos de Programação",
        workloadHours: 64,
        department: { id: 1, name: "Departamento Aurora" },
        courses: [{ id: 1, name: "Computação Aplicada" }],
      },
    ];
    const listDisciplines = vi.fn().mockResolvedValue(disciplines);
    const response = await request(createApp({ ...currentDependencies, listDisciplines })).get(path);

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(disciplines);
    expect(listDisciplines).toHaveBeenCalledWith(filters);
  });

  it.each([
    "/disciplines?search=",
    "/disciplines?departmentId=0",
    "/disciplines?courseId=abc",
    "/disciplines?unknown=1",
  ])("rejects invalid discipline filters: %s", async (path) => {
    const listDisciplines = vi.fn();
    const response = await request(createApp({ ...currentDependencies, listDisciplines })).get(path);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_DISCIPLINE_FILTERS");
    expect(listDisciplines).not.toHaveBeenCalled();
  });

  it("returns discipline details and passes the numeric id", async () => {
    const discipline = {
      id: 1,
      code: "CMP101",
      name: "Fundamentos de Programação",
      workloadHours: 64,
      department: { id: 1, name: "Departamento Aurora" },
      courses: [{ id: 1, name: "Computação Aplicada" }],
      professors: [{ id: 1, name: "Ada Ribeiro" }],
    };
    const findDisciplineById = vi.fn().mockResolvedValue(discipline);
    const response = await request(createApp({ ...currentDependencies, findDisciplineById }))
      .get("/disciplines/1");

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(discipline);
    expect(findDisciplineById).toHaveBeenCalledWith(1);
  });

  it.each(["abc", "0", "01", "2147483648"])("rejects invalid discipline id %s", async (id) => {
    const findDisciplineById = vi.fn();
    const response = await request(createApp({ ...currentDependencies, findDisciplineById }))
      .get(`/disciplines/${id}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_DISCIPLINE_ID");
    expect(findDisciplineById).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing discipline", async () => {
    const findDisciplineById = vi.fn().mockResolvedValue(undefined);
    const response = await request(createApp({ ...currentDependencies, findDisciplineById }))
      .get("/disciplines/999");

    expect(response.status).toBe(404);
    expect(response.body).toStrictEqual({
      error: { code: "DISCIPLINE_NOT_FOUND", message: "Discipline not found." },
    });
    expect(findDisciplineById).toHaveBeenCalledWith(999);
  });
});
