import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

describe("GET /health", () => {
  it("returns the API health status", async () => {
    const app = createApp({
      createReview: async () => ({
        id: 0,
        professorId: 0,
        rating: 1,
        comment: "",
      }),
      findProfessorById: async () => undefined,
      listProfessors: async () => [],
      listReviewsByProfessorId: async () => [],
    });
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ status: "ok" });
  });
});
