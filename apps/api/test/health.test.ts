import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

describe("GET /health", () => {
  it("returns the API health status", async () => {
    const app = createApp({
      findProfessorById: async () => undefined,
      listProfessors: async () => [],
    });
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({ status: "ok" });
  });
});
