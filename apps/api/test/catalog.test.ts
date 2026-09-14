import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";

const currentDependencies = {
  createReview: async () => ({
    id: 1,
    professorId: 1,
    disciplineId: null,
    targetType: "professor" as const,
    rating: 5,
    ratings: { didactics: 5, clarity: 5, punctuality: 5, availability: 5 },
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

const timestamp = new Date("2026-01-10T12:00:00.000Z");
const disciplineRatings = { difficulty: 3, relevance: 5, workload: 4 };
const student = {
  id: 7,
  name: "Lia Estudante",
  email: "lia@student.profrate.test",
  passwordHash: "hash-de-teste",
  role: "student" as const,
  courseId: 1,
  course: { id: 1, name: "Computação Aplicada" },
  active: true,
  createdAt: timestamp,
  updatedAt: timestamp,
};
const discipline = {
  id: 1,
  code: "CMP101",
  name: "Fundamentos de Programação",
  workloadHours: 64,
  reviewCount: 2,
  averageRating: 4,
  department: { id: 1, name: "Departamento Aurora" },
  courses: [{ id: 1, name: "Computação Aplicada" }],
  professors: [],
};
const disciplineReview = {
  id: 4,
  professorId: null,
  disciplineId: 1,
  targetType: "discipline" as const,
  rating: 4,
  ratings: disciplineRatings,
  comment: "Conteúdo bem distribuído.",
  createdAt: timestamp,
  updatedAt: timestamp,
  canManage: true,
};

function authenticatedDependencies(overrides: Record<string, unknown> = {}) {
  return {
    ...currentDependencies,
    findDisciplineById: async () => discipline,
    findUserById: async () => student,
    verifyToken: async () => ({ userId: student.id, role: "student" as const }),
    ...overrides,
  };
}

const bearer = { Authorization: "Bearer valid-token" };

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

describe("discipline review endpoints", () => {
  it("lists public reviews and calculates canManage only for an authenticated owner", async () => {
    const listReviewsByDisciplineId = vi.fn().mockResolvedValue([disciplineReview]);
    const publicResponse = await request(createApp({
      ...currentDependencies,
      findDisciplineById: async () => discipline,
      listReviewsByDisciplineId,
    })).get("/disciplines/1/reviews");

    expect(publicResponse.status).toBe(200);
    expect(listReviewsByDisciplineId).toHaveBeenNthCalledWith(1, 1);

    const authenticatedResponse = await request(createApp(authenticatedDependencies({
      listReviewsByDisciplineId,
    }))).get("/disciplines/1/reviews").set(bearer);

    expect(authenticatedResponse.status).toBe(200);
    expect(authenticatedResponse.text).not.toContain("authorId");
    expect(listReviewsByDisciplineId).toHaveBeenNthCalledWith(2, 1, student.id);
  });

  it("creates a discipline review from complete criteria without accepting a client average", async () => {
    const createDisciplineReview = vi.fn().mockResolvedValue(disciplineReview);
    const response = await request(createApp(authenticatedDependencies({ createDisciplineReview })))
      .post("/disciplines/1/reviews")
      .set(bearer)
      .send({ ratings: disciplineRatings, comment: "  Conteúdo bem distribuído.  " });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ targetType: "discipline", rating: 4, ratings: disciplineRatings });
    expect(createDisciplineReview).toHaveBeenCalledWith({
      disciplineId: 1,
      authorId: student.id,
      ratings: disciplineRatings,
      comment: "Conteúdo bem distribuído.",
    });
  });

  it.each([
    ["missing criterion", { ratings: { difficulty: 3, relevance: 5 }, comment: "Comentário válido." }],
    ["wrong criterion", { ratings: { ...disciplineRatings, didactics: 5 }, comment: "Comentário válido." }],
    ["criterion below range", { ratings: { ...disciplineRatings, difficulty: 0 }, comment: "Comentário válido." }],
    ["criterion above range", { ratings: { ...disciplineRatings, workload: 6 }, comment: "Comentário válido." }],
    ["client rating", { ratings: disciplineRatings, rating: 4, comment: "Comentário válido." }],
  ])("rejects %s before repository access", async (_label, body) => {
    const createDisciplineReview = vi.fn();
    const findDisciplineById = vi.fn();
    const response = await request(createApp(authenticatedDependencies({
      createDisciplineReview,
      findDisciplineById,
    }))).post("/disciplines/1/reviews").set(bearer).send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_REVIEW_INPUT");
    expect(findDisciplineById).not.toHaveBeenCalled();
    expect(createDisciplineReview).not.toHaveBeenCalled();
  });

  it("updates all discipline criteria and the comment in one PATCH", async () => {
    const updateDisciplineReview = vi.fn().mockResolvedValue(disciplineReview);
    const response = await request(createApp(authenticatedDependencies({
      findDisciplineReviewOwnership: async () => ({ authorId: student.id }),
      updateDisciplineReview,
    }))).patch("/disciplines/1/reviews/4").set(bearer).send({
      ratings: disciplineRatings,
      comment: "  Conteúdo bem distribuído.  ",
    });

    expect(response.status).toBe(200);
    expect(updateDisciplineReview).toHaveBeenCalledWith({
      disciplineId: 1,
      reviewId: 4,
      authorId: student.id,
      ratings: disciplineRatings,
      comment: "Conteúdo bem distribuído.",
    });
  });

  it("protects a discipline review owned by another student", async () => {
    const updateDisciplineReview = vi.fn();
    const response = await request(createApp(authenticatedDependencies({
      findDisciplineReviewOwnership: async () => ({ authorId: 99 }),
      updateDisciplineReview,
    }))).patch("/disciplines/1/reviews/4").set(bearer).send({ ratings: disciplineRatings });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("REVIEW_NOT_OWNED");
    expect(updateDisciplineReview).not.toHaveBeenCalled();
  });

  it("deletes only with discipline, review, and author ownership", async () => {
    const deleteDisciplineReview = vi.fn().mockResolvedValue({ id: 4 });
    const response = await request(createApp(authenticatedDependencies({
      deleteDisciplineReview,
      findDisciplineReviewOwnership: async () => ({ authorId: student.id }),
    }))).delete("/disciplines/1/reviews/4").set(bearer);

    expect(response.status).toBe(204);
    expect(deleteDisciplineReview).toHaveBeenCalledWith({
      disciplineId: 1,
      reviewId: 4,
      authorId: student.id,
    });
  });
});
