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
    const app = createApp({ listProfessors });

    const response = await request(app).get("/professors");

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(professors);
    expect(listProfessors).toHaveBeenCalledOnce();
  });
});
