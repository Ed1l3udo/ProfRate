import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";

const timestamp = new Date("2026-01-10T12:00:00.000Z");
const student = {
  id: 7,
  name: "Ana Exemplo",
  email: "ana@student.profrate.test",
  passwordHash: "$2b$12$hash",
  role: "student" as const,
  courseId: 1,
  course: { id: 1, name: "Computação Aplicada" },
  active: true,
  createdAt: timestamp,
  updatedAt: timestamp,
};
const moderator = {
  ...student,
  id: 8,
  name: "Mauro Moderador",
  email: "moderador@profrate.test",
  role: "moderator" as const,
  courseId: null,
  course: null,
};

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    createReview: async () => ({
      id: 10,
      professorId: 1,
      rating: 5,
      comment: "Ótima organização.",
      createdAt: timestamp,
      updatedAt: timestamp,
      canManage: true,
    }),
    deleteReview: async () => undefined,
    findProfessorById: async () => ({ id: 1, name: "Ada Ribeiro", department: "Departamento Aurora" }),
    findReviewOwnership: async () => ({ authorId: student.id }),
    findUserById: async () => student,
    listProfessors: async () => [],
    listReviewsByAuthorId: async () => [],
    listReviewsByProfessorId: async () => [],
    updateReview: async () => undefined,
    verifyToken: async () => ({ userId: student.id, role: "student" as const }),
    ...overrides,
  };
}

const bearer = { Authorization: "Bearer valid-token" };

describe("authentication API", () => {
  it("creates a student, normalizes input, and returns no password hash", async () => {
    const createStudent = vi.fn().mockResolvedValue(student);
    const hashPassword = vi.fn().mockResolvedValue("secure-hash");
    const signToken = vi.fn().mockResolvedValue("signed-token");
    const app = createApp(dependencies({
      createStudent,
      findCourseById: async () => ({ id: 1, name: "Computação Aplicada" }),
      hashPassword,
      signToken,
    }));
    const response = await request(app).post("/auth/signup").send({
      name: "  Ana Exemplo  ",
      email: "  ANA@STUDENT.PROFRATE.TEST  ",
      password: "Senha123",
      courseId: 1,
    });

    expect(response.status).toBe(201);
    expect(response.body).toStrictEqual({
      user: {
        id: 7,
        name: "Ana Exemplo",
        email: "ana@student.profrate.test",
        role: "student",
        course: { id: 1, name: "Computação Aplicada" },
      },
      token: "signed-token",
    });
    expect(hashPassword).toHaveBeenCalledWith("Senha123");
    expect(createStudent).toHaveBeenCalledWith({
      name: "Ana Exemplo",
      email: "ana@student.profrate.test",
      passwordHash: "secure-hash",
      courseId: 1,
    });
    expect(response.text).not.toContain("passwordHash");
  });

  it("returns 409 for an already registered normalized email", async () => {
    const createStudent = vi.fn().mockResolvedValue(undefined);
    const response = await request(createApp(dependencies({
      createStudent,
      findCourseById: async () => ({ id: 1, name: "Computação Aplicada" }),
      hashPassword: async () => "hash",
    }))).post("/auth/signup").send({
      name: "Ana Exemplo",
      email: "ANA@STUDENT.PROFRATE.TEST",
      password: "Senha123",
      courseId: 1,
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_ALREADY_REGISTERED");
    expect(createStudent.mock.calls[0][0].email).toBe("ana@student.profrate.test");
  });

  it("returns 404 before hashing when the signup course is missing", async () => {
    const hashPassword = vi.fn();
    const response = await request(createApp(dependencies({
      findCourseById: async () => undefined,
      hashPassword,
    }))).post("/auth/signup").send({
      name: "Ana Exemplo",
      email: "ana@student.profrate.test",
      password: "Senha123",
      courseId: 999,
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("COURSE_NOT_FOUND");
    expect(hashPassword).not.toHaveBeenCalled();
  });

  it.each([
    ["short", "Abc123"],
    ["without a letter", "12345678"],
    ["without a number", "abcdefgh"],
  ])("rejects a password %s", async (_label, password) => {
    const response = await request(createApp(dependencies()))
      .post("/auth/signup")
      .send({ name: "Ana Exemplo", email: "ana@student.profrate.test", password, courseId: 1 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_SIGNUP_INPUT");
  });

  it.each(["role", "active", "passwordHash"])("rejects client-controlled signup field %s", async (field) => {
    const response = await request(createApp(dependencies()))
      .post("/auth/signup")
      .send({
        name: "Ana Exemplo",
        email: "ana@student.profrate.test",
        password: "Senha123",
        courseId: 1,
        [field]: field === "role" ? "moderator" : true,
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_SIGNUP_INPUT");
  });

  it("logs in with a normalized email and a generic token", async () => {
    const findUserByEmail = vi.fn().mockResolvedValue(student);
    const verifyPassword = vi.fn().mockResolvedValue(true);
    const response = await request(createApp(dependencies({
      findUserByEmail,
      signToken: async () => "signed-token",
      verifyPassword,
    }))).post("/auth/login").send({ email: " ANA@STUDENT.PROFRATE.TEST ", password: "Senha123" });

    expect(response.status).toBe(200);
    expect(response.body.token).toBe("signed-token");
    expect(findUserByEmail).toHaveBeenCalledWith("ana@student.profrate.test");
    expect(verifyPassword).toHaveBeenCalledWith("Senha123", student.passwordHash);
    expect(response.text).not.toContain("passwordHash");
  });

  it.each([
    ["missing email", undefined, false],
    ["wrong password", student, false],
  ])("returns the same generic credentials error for %s", async (_label, foundUser, passwordMatches) => {
    const verifyPassword = vi.fn().mockResolvedValue(passwordMatches);
    const response = await request(createApp(dependencies({
      findUserByEmail: async () => foundUser,
      verifyPassword,
    }))).post("/auth/login").send({ email: "unknown@profrate.test", password: "Senha123" });

    expect(response.status).toBe(401);
    expect(response.body).toStrictEqual({
      error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." },
    });
    expect(verifyPassword).toHaveBeenCalledTimes(1);
  });

  it("returns USER_BLOCKED only after a valid password", async () => {
    const response = await request(createApp(dependencies({
      findUserByEmail: async () => ({ ...student, active: false }),
      verifyPassword: async () => true,
    }))).post("/auth/login").send({ email: student.email, password: "Senha123" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("USER_BLOCKED");
  });

  it("returns the authenticated user and updates only allowed profile fields", async () => {
    const updateProfile = vi.fn().mockResolvedValue({ ...student, name: "Ana Atualizada" });
    const app = createApp(dependencies({
      findCourseById: async () => ({ id: 1, name: "Computação Aplicada" }),
      updateProfile,
    }));

    const meResponse = await request(app).get("/me").set(bearer);
    const patchResponse = await request(app).patch("/me").set(bearer).send({ name: " Ana Atualizada " });

    expect(meResponse.status).toBe(200);
    expect(meResponse.text).not.toContain("passwordHash");
    expect(patchResponse.status).toBe(200);
    expect(updateProfile).toHaveBeenCalledWith({ id: 7, name: "Ana Atualizada" });
  });

  it.each([
    ["missing", undefined, "AUTHENTICATION_REQUIRED"],
    ["invalid", "Bearer invalid", "INVALID_AUTH_TOKEN"],
    ["expired", "Bearer expired", "INVALID_AUTH_TOKEN"],
  ])("rejects a %s token", async (_label, authorization, code) => {
    const app = createApp(dependencies({ verifyToken: async () => { throw new Error("invalid"); } }));
    const requestBuilder = request(app).get("/me");
    if (authorization !== undefined) requestBuilder.set("Authorization", authorization);
    const response = await requestBuilder;

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(code);
  });
});

describe("review authorization", () => {
  it("takes authorId exclusively from the token and never exposes it", async () => {
    const createReview = vi.fn().mockResolvedValue({
      id: 10,
      professorId: 1,
      rating: 5,
      comment: "Ótima organização.",
      createdAt: timestamp,
      updatedAt: timestamp,
      canManage: true,
    });
    const response = await request(createApp(dependencies({ createReview })))
      .post("/professors/1/reviews")
      .set(bearer)
      .send({ rating: 5, comment: "Ótima organização." });

    expect(response.status).toBe(201);
    expect(createReview).toHaveBeenCalledWith(expect.objectContaining({ authorId: 7 }));
    expect(response.body.canManage).toBe(true);
    expect(response.text).not.toContain("authorId");
  });

  it("prevents a student from editing another student's or a legacy review", async () => {
    const updateReview = vi.fn();
    const response = await request(createApp(dependencies({
      findReviewOwnership: async () => ({ authorId: 99 }),
      updateReview,
    }))).patch("/professors/1/reviews/2").set(bearer).send({ rating: 4 });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("REVIEW_NOT_OWNED");
    expect(updateReview).not.toHaveBeenCalled();
  });

  it("prevents moderators from creating reviews", async () => {
    const createReview = vi.fn();
    const response = await request(createApp(dependencies({
      createReview,
      findUserById: async () => moderator,
      verifyToken: async () => ({ userId: moderator.id, role: "moderator" as const }),
    }))).post("/professors/1/reviews").set(bearer).send({ rating: 5, comment: "Teste" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("STUDENT_REQUIRED");
    expect(createReview).not.toHaveBeenCalled();
  });

  it.each([
    ["without token", undefined, undefined],
    ["with owner token", "Bearer valid-token", 7],
  ])("calculates canManage %s without exposing authorId", async (_label, authorization, viewerId) => {
    const listReviewsByProfessorId = vi.fn().mockResolvedValue([
      { id: 1, professorId: 1, rating: 5, comment: "Pública", createdAt: timestamp, updatedAt: timestamp, canManage: viewerId === 7 },
    ]);
    const requestBuilder = request(createApp(dependencies({ listReviewsByProfessorId })))
      .get("/professors/1/reviews");
    if (authorization !== undefined) requestBuilder.set("Authorization", authorization);
    const response = await requestBuilder;

    expect(response.status).toBe(200);
    expect(response.body[0].canManage).toBe(viewerId === 7);
    expect(response.text).not.toContain("authorId");
    expect(listReviewsByProfessorId).toHaveBeenCalledWith(...(viewerId === undefined ? [1] : [1, viewerId]));
  });
});
