import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";

describe("GET /professors", () => {
  it("returns the professors provided by the repository", async () => {
    const professors = [
      { id: 1, name: "Ada Ribeiro" },
      { id: 2, name: "Caio Nogueira" },
      { id: 3, name: "Lina Vasconcelos" },
    ];
    const listProfessors = vi.fn().mockResolvedValue(professors);
    const app = createApp({
      findProfessorById: async () => undefined,
      listProfessors,
    });

    const response = await request(app).get("/professors");

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(professors);
    expect(listProfessors).toHaveBeenCalledOnce();
  });
});

describe("GET /professors/:id", () => {
  it("returns a professor and passes the converted id to the repository", async () => {
    const professor = {
      id: 1,
      name: "Ada Ribeiro",
      department: "Departamento Aurora",
    };
    const findProfessorById = vi.fn().mockResolvedValue(professor);
    const app = createApp({
      findProfessorById,
      listProfessors: async () => [],
    });

    const response = await request(app).get("/professors/1");

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(professor);
    expect(findProfessorById).toHaveBeenCalledOnce();
    expect(findProfessorById).toHaveBeenCalledWith(1);
  });

  it("returns 404 when a valid professor id does not exist", async () => {
    const findProfessorById = vi.fn().mockResolvedValue(undefined);
    const app = createApp({
      findProfessorById,
      listProfessors: async () => [],
    });

    const response = await request(app).get("/professors/999999");

    expect(response.status).toBe(404);
    expect(response.body).toStrictEqual({
      error: {
        code: "PROFESSOR_NOT_FOUND",
        message: "Professor not found.",
      },
    });
    expect(findProfessorById).toHaveBeenCalledOnce();
    expect(findProfessorById).toHaveBeenCalledWith(999999);
  });

  it.each(["abc", "0", "-1", "1.5", "1e3", "01", "2147483648"])(
    "returns 400 without querying the repository for invalid id %s",
    async (id) => {
      const findProfessorById = vi.fn();
      const app = createApp({
        findProfessorById,
        listProfessors: async () => [],
      });

      const response = await request(app).get(`/professors/${id}`);

      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        error: {
          code: "INVALID_PROFESSOR_ID",
          message: "Professor id must be a positive integer.",
        },
      });
      expect(findProfessorById).not.toHaveBeenCalled();
    },
  );
});
