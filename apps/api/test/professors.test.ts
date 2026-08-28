import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";

const testReview = {
  id: 0,
  professorId: 0,
  rating: 1,
  comment: "",
};

describe("GET /professors", () => {
  it("returns the professors provided by the repository", async () => {
    const professors = [
      { id: 1, name: "Ada Ribeiro", department: "Departamento Aurora" },
      { id: 2, name: "Caio Nogueira", department: "Departamento Horizonte" },
      { id: 3, name: "Lina Vasconcelos", department: "Departamento Pioneiro" },
    ];
    const listProfessors = vi.fn().mockResolvedValue(professors);
    const app = createApp({
      createReview: async () => testReview,
      deleteReview: async () => undefined,
      findProfessorById: async () => undefined,
      listProfessors,
      listReviewsByProfessorId: async () => [],
    });

    const response = await request(app).get("/professors");

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(professors);
    expect(listProfessors).toHaveBeenCalledOnce();
    expect(listProfessors).toHaveBeenCalledWith({});
  });

  it("passes a trimmed search filter to the repository", async () => {
    const listProfessors = vi.fn().mockResolvedValue([]);
    const app = createApp({
      createReview: async () => testReview,
      deleteReview: async () => undefined,
      findProfessorById: async () => undefined,
      listProfessors,
      listReviewsByProfessorId: async () => [],
    });

    const response = await request(app).get("/professors?search=%20ada%20");

    expect(response.status).toBe(200);
    expect(listProfessors).toHaveBeenCalledWith({ search: "ada" });
  });

  it("passes a trimmed department filter to the repository", async () => {
    const listProfessors = vi.fn().mockResolvedValue([]);
    const app = createApp({
      createReview: async () => testReview,
      deleteReview: async () => undefined,
      findProfessorById: async () => undefined,
      listProfessors,
      listReviewsByProfessorId: async () => [],
    });

    const response = await request(app).get("/professors?department=%20aurora%20");

    expect(response.status).toBe(200);
    expect(listProfessors).toHaveBeenCalledWith({ department: "aurora" });
  });

  it("passes both filters to the repository", async () => {
    const listProfessors = vi.fn().mockResolvedValue([]);
    const app = createApp({
      createReview: async () => testReview,
      deleteReview: async () => undefined,
      findProfessorById: async () => undefined,
      listProfessors,
      listReviewsByProfessorId: async () => [],
    });

    const response = await request(app).get(
      "/professors?search=%20ada%20&department=%20aurora%20",
    );

    expect(response.status).toBe(200);
    expect(listProfessors).toHaveBeenCalledWith({ search: "ada", department: "aurora" });
  });

  it.each([
    "/professors?search=",
    "/professors?search=ada&search=caio",
    "/professors?search=ada&extra=value",
  ])("rejects invalid professor filters without querying the repository: %s", async (path) => {
    const listProfessors = vi.fn();
    const app = createApp({
      createReview: async () => testReview,
      deleteReview: async () => undefined,
      findProfessorById: async () => undefined,
      listProfessors,
      listReviewsByProfessorId: async () => [],
    });

    const response = await request(app).get(path);

    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      error: {
        code: "INVALID_PROFESSOR_FILTERS",
        message: "Professor filters must be non-empty text values.",
      },
    });
    expect(listProfessors).not.toHaveBeenCalled();
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
      createReview: async () => testReview,
      deleteReview: async () => undefined,
      findProfessorById,
      listProfessors: async () => [],
      listReviewsByProfessorId: async () => [],
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
      createReview: async () => testReview,
      deleteReview: async () => undefined,
      findProfessorById,
      listProfessors: async () => [],
      listReviewsByProfessorId: async () => [],
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
        createReview: async () => testReview,
        deleteReview: async () => undefined,
        findProfessorById,
        listProfessors: async () => [],
        listReviewsByProfessorId: async () => [],
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

describe("GET /professors/:id/reviews", () => {
  it("returns the reviews for an existing professor", async () => {
    const reviews = [
      {
        id: 1,
        professorId: 1,
        rating: 5,
        comment: "Explicações claras e atividades bem organizadas.",
      },
      {
        id: 2,
        professorId: 1,
        rating: 4,
        comment: "Feedbacks úteis durante os exercícios.",
      },
    ];
    const findProfessorById = vi.fn().mockResolvedValue({
      id: 1,
      name: "Ada Ribeiro",
      department: "Departamento Aurora",
    });
    const listReviewsByProfessorId = vi.fn().mockResolvedValue(reviews);
    const app = createApp({
      createReview: async () => testReview,
      deleteReview: async () => undefined,
      findProfessorById,
      listProfessors: async () => [],
      listReviewsByProfessorId,
    });

    const response = await request(app).get("/professors/1/reviews");

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(reviews);
    expect(findProfessorById).toHaveBeenCalledOnce();
    expect(findProfessorById).toHaveBeenCalledWith(1);
    expect(listReviewsByProfessorId).toHaveBeenCalledOnce();
    expect(listReviewsByProfessorId).toHaveBeenCalledWith(1);
  });

  it("returns an empty array when an existing professor has no reviews", async () => {
    const findProfessorById = vi.fn().mockResolvedValue({
      id: 3,
      name: "Lina Vasconcelos",
      department: "Departamento Pioneiro",
    });
    const listReviewsByProfessorId = vi.fn().mockResolvedValue([]);
    const app = createApp({
      createReview: async () => testReview,
      deleteReview: async () => undefined,
      findProfessorById,
      listProfessors: async () => [],
      listReviewsByProfessorId,
    });

    const response = await request(app).get("/professors/3/reviews");

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual([]);
    expect(findProfessorById).toHaveBeenCalledWith(3);
    expect(listReviewsByProfessorId).toHaveBeenCalledWith(3);
  });

  it("returns 404 without listing reviews when the professor does not exist", async () => {
    const findProfessorById = vi.fn().mockResolvedValue(undefined);
    const listReviewsByProfessorId = vi.fn();
    const app = createApp({
      createReview: async () => testReview,
      deleteReview: async () => undefined,
      findProfessorById,
      listProfessors: async () => [],
      listReviewsByProfessorId,
    });

    const response = await request(app).get("/professors/999999/reviews");

    expect(response.status).toBe(404);
    expect(response.body).toStrictEqual({
      error: {
        code: "PROFESSOR_NOT_FOUND",
        message: "Professor not found.",
      },
    });
    expect(findProfessorById).toHaveBeenCalledOnce();
    expect(findProfessorById).toHaveBeenCalledWith(999999);
    expect(listReviewsByProfessorId).not.toHaveBeenCalled();
  });

  it.each(["abc", "0", "-1", "1.5", "1e3", "01", "2147483648"])(
    "returns 400 without querying repositories for invalid id %s",
    async (id) => {
      const findProfessorById = vi.fn();
      const listReviewsByProfessorId = vi.fn();
      const app = createApp({
        createReview: async () => testReview,
        deleteReview: async () => undefined,
        findProfessorById,
        listProfessors: async () => [],
        listReviewsByProfessorId,
      });

      const response = await request(app).get(`/professors/${id}/reviews`);

      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        error: {
          code: "INVALID_PROFESSOR_ID",
          message: "Professor id must be a positive integer.",
        },
      });
      expect(findProfessorById).not.toHaveBeenCalled();
      expect(listReviewsByProfessorId).not.toHaveBeenCalled();
    },
  );
});

describe("POST /professors/:id/reviews", () => {
  it("creates a review with a converted id and trimmed comment", async () => {
    const createdReview = {
      id: 4,
      professorId: 1,
      rating: 5,
      comment: "Explicações muito claras.",
    };
    const findProfessorById = vi.fn().mockResolvedValue({
      id: 1,
      name: "Ada Ribeiro",
      department: "Departamento Aurora",
    });
    const createReview = vi.fn().mockResolvedValue(createdReview);
    const app = createApp({
      createReview,
      deleteReview: async () => undefined,
      findProfessorById,
      listProfessors: async () => [],
      listReviewsByProfessorId: async () => [],
    });

    const response = await request(app).post("/professors/1/reviews").send({
      rating: 5,
      comment: "  Explicações muito claras.  ",
    });

    expect(response.status).toBe(201);
    expect(response.body).toStrictEqual(createdReview);
    expect(findProfessorById).toHaveBeenCalledOnce();
    expect(findProfessorById).toHaveBeenCalledWith(1);
    expect(createReview).toHaveBeenCalledOnce();
    expect(createReview).toHaveBeenCalledWith({
      professorId: 1,
      rating: 5,
      comment: "Explicações muito claras.",
    });
  });

  it("returns 404 without creating a review when the professor does not exist", async () => {
    const findProfessorById = vi.fn().mockResolvedValue(undefined);
    const createReview = vi.fn();
    const app = createApp({
      createReview,
      deleteReview: async () => undefined,
      findProfessorById,
      listProfessors: async () => [],
      listReviewsByProfessorId: async () => [],
    });

    const response = await request(app).post("/professors/999999/reviews").send({
      rating: 5,
      comment: "Explicações muito claras.",
    });

    expect(response.status).toBe(404);
    expect(response.body).toStrictEqual({
      error: {
        code: "PROFESSOR_NOT_FOUND",
        message: "Professor not found.",
      },
    });
    expect(findProfessorById).toHaveBeenCalledWith(999999);
    expect(createReview).not.toHaveBeenCalled();
  });

  it.each(["abc", "0", "-1", "1.5", "1e3", "01", "2147483648"])(
    "returns 400 without querying repositories for invalid id %s",
    async (id) => {
      const findProfessorById = vi.fn();
      const createReview = vi.fn();
      const app = createApp({
        createReview,
        deleteReview: async () => undefined,
        findProfessorById,
        listProfessors: async () => [],
        listReviewsByProfessorId: async () => [],
      });

      const response = await request(app).post(`/professors/${id}/reviews`).send({
        rating: 5,
        comment: "Explicações muito claras.",
      });

      expect(response.status).toBe(400);
      expect(response.body).toStrictEqual({
        error: {
          code: "INVALID_PROFESSOR_ID",
          message: "Professor id must be a positive integer.",
        },
      });
      expect(findProfessorById).not.toHaveBeenCalled();
      expect(createReview).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["rating 0", { rating: 0, comment: "Comentário válido." }],
    ["rating 6", { rating: 6, comment: "Comentário válido." }],
    ["decimal rating", { rating: 1.5, comment: "Comentário válido." }],
    ["string rating", { rating: "5", comment: "Comentário válido." }],
    ["missing rating", { comment: "Comentário válido." }],
    ["empty comment", { rating: 5, comment: "" }],
    ["blank comment", { rating: 5, comment: "   " }],
    ["non-text comment", { rating: 5, comment: 123 }],
    ["missing comment", { rating: 5 }],
    ["extra property", { rating: 5, comment: "Comentário válido.", extra: true }],
  ])("returns 400 without querying repositories for %s", async (_name, body) => {
    const findProfessorById = vi.fn();
    const createReview = vi.fn();
    const app = createApp({
      createReview,
      deleteReview: async () => undefined,
      findProfessorById,
      listProfessors: async () => [],
      listReviewsByProfessorId: async () => [],
    });

    const response = await request(app).post("/professors/1/reviews").send(body);

    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      error: {
        code: "INVALID_REVIEW_INPUT",
        message:
          "Review body must include an integer rating from 1 to 5 and a non-empty comment.",
      },
    });
    expect(findProfessorById).not.toHaveBeenCalled();
    expect(createReview).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON without querying repositories", async () => {
    const findProfessorById = vi.fn();
    const createReview = vi.fn();
    const app = createApp({
      createReview,
      deleteReview: async () => undefined,
      findProfessorById,
      listProfessors: async () => [],
      listReviewsByProfessorId: async () => [],
    });

    const response = await request(app)
      .post("/professors/1/reviews")
      .set("Content-Type", "application/json")
      .send('{"rating": 5, "comment":');

    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({
      error: {
        code: "INVALID_JSON_BODY",
        message: "Request body must be valid JSON.",
      },
    });
    expect(findProfessorById).not.toHaveBeenCalled();
    expect(createReview).not.toHaveBeenCalled();
  });
});

describe("DELETE /professors/:professorId/reviews/:reviewId", () => {
  const existingProfessor = {
    id: 1,
    name: "Ada Ribeiro",
    department: "Departamento Aurora",
  };

  function createDeleteApp(
    findProfessorById: (id: number) => Promise<{
      id: number;
      name: string;
      department: string;
    } | undefined>,
    deleteReview: (args: { professorId: number; reviewId: number }) => Promise<{
      id: number;
      professorId: number;
      rating: number;
      comment: string;
    } | undefined>,
  ) {
    return createApp({
      createReview: async () => testReview,
      deleteReview,
      findProfessorById,
      listProfessors: async () => [],
      listReviewsByProfessorId: async () => [],
    });
  }

  it("returns 204 with no body and passes numeric ids", async () => {
    const findProfessorById = vi.fn().mockResolvedValue(existingProfessor);
    const deleteReview = vi.fn().mockResolvedValue({
      id: 4,
      professorId: 1,
      rating: 5,
      comment: "Temporária",
    });

    const response = await request(
      createDeleteApp(findProfessorById, deleteReview),
    ).delete("/professors/1/reviews/4");

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(findProfessorById).toHaveBeenCalledWith(1);
    expect(deleteReview).toHaveBeenCalledWith({ professorId: 1, reviewId: 4 });
  });

  it.each([
    ["professors/abc/reviews/4", "INVALID_PROFESSOR_ID", "Professor id must be a positive integer."],
    ["professors/1/reviews/abc", "INVALID_REVIEW_ID", "Review id must be a positive integer."],
    ["professors/1/reviews/0", "INVALID_REVIEW_ID", "Review id must be a positive integer."],
    ["professors/1/reviews/-1", "INVALID_REVIEW_ID", "Review id must be a positive integer."],
    ["professors/1/reviews/1.5", "INVALID_REVIEW_ID", "Review id must be a positive integer."],
    ["professors/1/reviews/1e3", "INVALID_REVIEW_ID", "Review id must be a positive integer."],
    ["professors/1/reviews/01", "INVALID_REVIEW_ID", "Review id must be a positive integer."],
    ["professors/1/reviews/2147483648", "INVALID_REVIEW_ID", "Review id must be a positive integer."],
  ])("rejects invalid ids without querying repositories: %s", async (path, code, message) => {
    const findProfessorById = vi.fn();
    const deleteReview = vi.fn();
    const response = await request(createDeleteApp(findProfessorById, deleteReview)).delete(`/${path}`);

    expect(response.status).toBe(400);
    expect(response.body).toStrictEqual({ error: { code, message } });
    expect(findProfessorById).not.toHaveBeenCalled();
    expect(deleteReview).not.toHaveBeenCalled();
  });

  it("returns professor not found without deleting", async () => {
    const findProfessorById = vi.fn().mockResolvedValue(undefined);
    const deleteReview = vi.fn();
    const response = await request(createDeleteApp(findProfessorById, deleteReview)).delete(
      "/professors/999999/reviews/4",
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PROFESSOR_NOT_FOUND");
    expect(deleteReview).not.toHaveBeenCalled();
  });

  it("returns review not found when the review does not exist", async () => {
    const findProfessorById = vi.fn().mockResolvedValue(existingProfessor);
    const deleteReview = vi.fn().mockResolvedValue(undefined);
    const response = await request(createDeleteApp(findProfessorById, deleteReview)).delete(
      "/professors/1/reviews/999",
    );

    expect(response.status).toBe(404);
    expect(response.body).toStrictEqual({
      error: { code: "REVIEW_NOT_FOUND", message: "Review not found." },
    });
    expect(deleteReview).toHaveBeenCalledWith({ professorId: 1, reviewId: 999 });
  });

  it("returns review not found when the review belongs to another professor", async () => {
    const findProfessorById = vi.fn().mockResolvedValue({
      id: 2,
      name: "Caio Nogueira",
      department: "Departamento Horizonte",
    });
    const deleteReview = vi.fn().mockResolvedValue(undefined);
    const response = await request(createDeleteApp(findProfessorById, deleteReview)).delete(
      "/professors/2/reviews/1",
    );

    expect(response.status).toBe(404);
    expect(response.body).toStrictEqual({
      error: { code: "REVIEW_NOT_FOUND", message: "Review not found." },
    });
    expect(deleteReview).toHaveBeenCalledWith({ professorId: 2, reviewId: 1 });
  });
});
