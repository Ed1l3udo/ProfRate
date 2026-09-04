import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import { App } from "./App.js";
import { ProfessorReviews } from "./components/ProfessorReviews.js";
import { ProfessorDetailsPage } from "./pages/ProfessorDetailsPage.js";
import type { Review } from "./types/professor.js";

function renderApp(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>,
  );
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;

  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

const ada = {
  id: 1,
  name: "Ada Ribeiro",
  department: "Departamento Aurora",
};

const adaReviews = [
  {
    id: 1,
    professorId: 1,
    rating: 5,
    comment: "Explicações claras e atividades bem organizadas.",
    createdAt: "2025-01-10T12:00:00.000Z",
    updatedAt: "2025-01-10T12:00:00.000Z",
  },
  {
    id: 2,
    professorId: 1,
    rating: 4,
    comment: "Feedbacks úteis durante os exercícios.",
    createdAt: "2025-01-10T12:00:00.000Z",
    updatedAt: "2025-01-10T12:00:00.000Z",
  },
];

const orderedReviews: Review[] = [
  {
    id: 1,
    professorId: 1,
    rating: 3,
    comment: "Nota três mais antiga.",
    createdAt: "2025-01-01T12:00:00.000Z",
    updatedAt: "2025-01-01T12:00:00.000Z",
  },
  {
    id: 2,
    professorId: 1,
    rating: 5,
    comment: "Nota cinco recente de id menor.",
    createdAt: "2025-01-03T12:00:00.000Z",
    updatedAt: "2025-01-03T12:00:00.000Z",
  },
  {
    id: 3,
    professorId: 1,
    rating: 5,
    comment: "Nota cinco recente de id maior.",
    createdAt: "2025-01-03T12:00:00.000Z",
    updatedAt: "2025-01-03T12:00:00.000Z",
  },
  {
    id: 4,
    professorId: 1,
    rating: 1,
    comment: "Nota um de id menor.",
    createdAt: "2025-01-02T12:00:00.000Z",
    updatedAt: "2025-01-02T12:00:00.000Z",
  },
  {
    id: 5,
    professorId: 1,
    rating: 1,
    comment: "Nota um de id maior.",
    createdAt: "2025-01-02T12:00:00.000Z",
    updatedAt: "2025-01-02T12:00:00.000Z",
  },
  {
    id: 6,
    professorId: 1,
    rating: 5,
    comment: "Nota cinco antiga.",
    createdAt: "2024-12-31T12:00:00.000Z",
    updatedAt: "2024-12-31T12:00:00.000Z",
  },
  {
    id: 7,
    professorId: 1,
    rating: 2,
    comment: "Nota dois.",
    createdAt: "2025-01-02T10:00:00.000Z",
    updatedAt: "2025-01-02T10:00:00.000Z",
  },
  {
    id: 8,
    professorId: 1,
    rating: 4,
    comment: "Nota quatro.",
    createdAt: "2025-01-02T11:00:00.000Z",
    updatedAt: "2025-01-02T11:00:00.000Z",
  },
];

function stubReviewsFetch(reviews: Review[]) {
  const fetchMock = vi.fn((url: string) => {
    if (url === "/api/professors/1") {
      return Promise.resolve({ ok: true, status: 200, json: async () => ada });
    }

    if (url === "/api/professors/1/reviews") {
      return Promise.resolve({ ok: true, status: 200, json: async () => reviews });
    }

    throw new Error(`Unexpected URL: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function expectReviewOrder(comments: string[]) {
  const items = within(screen.getByRole("list")).getAllByRole("listitem");

  expect(items).toHaveLength(comments.length);
  comments.forEach((comment, index) => {
    expect(within(items[index]).getByText(comment)).toBeInTheDocument();
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("professors list", () => {
  it("shows links to the professor details pages", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 1, name: "Ada Ribeiro", department: "Departamento Aurora" },
        { id: 2, name: "Caio Nogueira", department: "Departamento Horizonte" },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/");

    expect(screen.getByText("Carregando...")).toBeInTheDocument();
    expect(await screen.findByText("Ada Ribeiro")).toBeInTheDocument();
    expect(screen.getByText("Caio Nogueira")).toBeInTheDocument();
    expect(screen.getByText("Departamento Aurora")).toBeInTheDocument();
    expect(screen.getByText("Departamento Horizonte")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/professors");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ signal: expect.any(AbortSignal) });
    expect(screen.getByRole("link", { name: "Ada Ribeiro" })).toHaveAttribute(
      "href",
      "/professors/1",
    );
    expect(screen.getByRole("link", { name: "Caio Nogueira" })).toHaveAttribute(
      "href",
      "/professors/2",
    );
  });

  it("shows an empty state when the API returns no professors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    renderApp("/");

    expect(await screen.findByText("Nenhum professor encontrado.")).toBeInTheDocument();
  });

  it("shows an error state when the API request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    renderApp("/");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os professores.",
    );
  });

  it("submits only the name filter and keeps typing from triggering requests", async () => {
    const fetchMock = vi.fn((url: string, _options?: RequestInit) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          url === "/api/professors?search=ada"
            ? [{ id: 1, name: "Ada Ribeiro", department: "Departamento Aurora" }]
            : [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/");
    await screen.findByText("Nenhum professor encontrado.");

    fireEvent.change(screen.getByLabelText("Buscar por nome"), {
      target: { value: " ada " },
    });
    expect(fetchMock).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText("Ada Ribeiro")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toBe("/api/professors?search=ada");
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ signal: expect.any(AbortSignal) });
  });

  it("submits only the department filter", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          url === "/api/professors?department=aurora"
            ? [{ id: 1, name: "Ada Ribeiro", department: "Departamento Aurora" }]
            : [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/");
    await screen.findByText("Nenhum professor encontrado.");
    fireEvent.change(screen.getByLabelText("Filtrar por departamento"), {
      target: { value: " aurora " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText("Ada Ribeiro")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toBe("/api/professors?department=aurora");
  });

  it("submits both filters using URLSearchParams", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          url === "/api/professors?search=ada&department=aurora"
            ? [{ id: 1, name: "Ada Ribeiro", department: "Departamento Aurora" }]
            : [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/");
    await screen.findByText("Nenhum professor encontrado.");
    fireEvent.change(screen.getByLabelText("Buscar por nome"), {
      target: { value: " ada " },
    });
    fireEvent.change(screen.getByLabelText("Filtrar por departamento"), {
      target: { value: " aurora " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText("Ada Ribeiro")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toBe(
      "/api/professors?search=ada&department=aurora",
    );
  });

  it("shows loading while a new filter request is pending", async () => {
    const filteredResponse = createDeferred<{
      ok: boolean;
      json: () => Promise<unknown>;
    }>();
    const fetchMock = vi.fn((url: string, _options?: RequestInit) => {
      if (url === "/api/professors") {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 1, name: "Ada Ribeiro", department: "Departamento Aurora" }],
        });
      }

      return filteredResponse.promise;
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/");
    await screen.findByText("Ada Ribeiro");
    fireEvent.change(screen.getByLabelText("Buscar por nome"), {
      target: { value: "ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText("Carregando...")).toBeInTheDocument();
    filteredResponse.resolve({ ok: true, json: async () => [] });
    expect(await screen.findByText("Nenhum professor encontrado.")).toBeInTheDocument();
  });

  it("clears filters and reloads the complete list", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          url === "/api/professors?search=ada"
            ? [{ id: 1, name: "Ada Ribeiro", department: "Departamento Aurora" }]
            : [
                { id: 1, name: "Ada Ribeiro", department: "Departamento Aurora" },
                { id: 2, name: "Caio Nogueira", department: "Departamento Horizonte" },
              ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/");
    await screen.findByText("Caio Nogueira");
    const searchInput = screen.getByLabelText("Buscar por nome");
    const departmentInput = screen.getByLabelText("Filtrar por departamento");
    fireEvent.change(searchInput, { target: { value: "ada" } });
    fireEvent.change(departmentInput, { target: { value: "aurora" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await screen.findByText("Ada Ribeiro");

    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));

    expect(await screen.findByText("Caio Nogueira")).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar por nome")).toHaveValue("");
    expect(screen.getByLabelText("Filtrar por departamento")).toHaveValue("");
    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe("/api/professors");
  });
});

describe("professor details", () => {
  it("does not render reviews while the professor details are pending", () => {
    const professorResponse = createDeferred<{
      ok: boolean;
      status: number;
      json: () => Promise<typeof ada>;
    }>();
    const fetchMock = vi.fn((url: string, _options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return professorResponse.promise;
      }

      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");

    expect(screen.getByText("Carregando professor...")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/professors/1");
    expect(screen.queryByRole("heading", { name: "Avaliações" })).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) => url === "/api/professors/1/reviews"),
    ).toBe(false);
  });

  it("shows the reviews loading state after professor details succeed", async () => {
    const reviewsResponse = createDeferred<{
      ok: boolean;
      status: number;
      json: () => Promise<typeof adaReviews>;
    }>();
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      if (url === "/api/professors/1/reviews") {
        return reviewsResponse.promise;
      }

      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");

    expect(await screen.findByRole("heading", { name: "Avaliações" })).toBeInTheDocument();
    expect(screen.getByText("Carregando avaliações...")).toBeInTheDocument();
    expect(screen.queryByLabelText("Resumo das avaliações")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Nova avaliação" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows reviews and uses the expected URLs with an abort signal", async () => {
    const fetchMock = vi.fn((url: string, _options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      if (url === "/api/professors/1/reviews") {
        return Promise.resolve({ ok: true, status: 200, json: async () => adaReviews });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");

    expect(await screen.findByText("Nota: 5/5")).toBeInTheDocument();
    expect(screen.getByLabelText("Resumo das avaliações")).toHaveTextContent("2 avaliações");
    expect(screen.getByLabelText("Resumo das avaliações")).toHaveTextContent("Média: 4,5/5");
    expect(screen.getByRole("heading", { name: "Nova avaliação" })).toBeInTheDocument();
    expect(screen.getByText("Nota: 4/5")).toBeInTheDocument();
    expect(
      screen.getByText("Explicações claras e atividades bem organizadas."),
    ).toBeInTheDocument();
    expect(screen.getByText("Feedbacks úteis durante os exercícios.")).toBeInTheDocument();
    expect(screen.queryByText(/professorId/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para a lista" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(fetchMock.mock.calls.map(([url]) => url)).toContain("/api/professors/1");
    expect(fetchMock.mock.calls.map(([url]) => url)).toContain("/api/professors/1/reviews");
    const reviewsCall = fetchMock.mock.calls.find(
      ([url]) => url === "/api/professors/1/reviews",
    );
    expect(reviewsCall?.[1]).toMatchObject({ signal: expect.anything() });
  });

  it("shows an empty state when the professor has no reviews", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      if (url === "/api/professors/1/reviews") {
        return Promise.resolve({ ok: true, status: 200, json: async () => [] });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");

    expect(await screen.findByText("Nenhuma avaliação ainda.")).toBeInTheDocument();
    expect(screen.getByLabelText("Resumo das avaliações")).toHaveTextContent("0 avaliações");
    expect(screen.getByLabelText("Resumo das avaliações")).toHaveTextContent("Sem média");
  });

  it("uses the singular label and rating for one review", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      if (url === "/api/professors/1/reviews") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [adaReviews[0]],
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");

    expect(await screen.findByText("Nota: 5/5")).toBeInTheDocument();
    expect(screen.getByLabelText("Resumo das avaliações")).toHaveTextContent("1 avaliação");
    expect(screen.getByLabelText("Resumo das avaliações")).toHaveTextContent("Média: 5,0/5");
  });

  it("creates a review and appends it without another reviews GET", async () => {
    const postResponse = createDeferred<{
      ok: boolean;
      status: number;
      json: () => Promise<typeof adaReviews[number]>;
    }>();
    const createdReview = {
      id: 3,
      professorId: 1,
      rating: 5,
      comment: "Comentário normalizado.",
      createdAt: "2025-01-10T12:00:00.000Z",
      updatedAt: "2025-01-10T12:00:00.000Z",
    };
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      if (url === "/api/professors/1/reviews" && options?.method === "POST") {
        return postResponse.promise;
      }

      if (url === "/api/professors/1/reviews") {
        return Promise.resolve({ ok: true, status: 200, json: async () => adaReviews });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");

    expect(await screen.findByText("Nota: 5/5")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nota"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Comentário"), {
      target: { value: "  Comentário digitado  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));

    expect(screen.getByRole("button", { name: "Enviando..." })).toBeDisabled();
    const postCall = fetchMock.mock.calls.find(
      ([url, options]) => url === "/api/professors/1/reviews" && options?.method === "POST",
    );
    expect(postCall?.[1]).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: expect.any(AbortSignal),
    });
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      rating: 5,
      comment: "  Comentário digitado  ",
    });

    postResponse.resolve({ ok: true, status: 201, json: async () => createdReview });

    expect(await screen.findByText("Comentário normalizado.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Avaliação enviada com sucesso.",
    );
    expect(screen.getByLabelText("Resumo das avaliações")).toHaveTextContent("3 avaliações");
    expect(screen.getByLabelText("Resumo das avaliações")).toHaveTextContent("Média: 4,7/5");
    expect(screen.getByLabelText("Nota")).toHaveValue(null);
    expect(screen.getByLabelText("Comentário")).toHaveValue("");
    expect(
      fetchMock.mock.calls.filter(
        ([url, options]) => url === "/api/professors/1/reviews" && options?.method !== "POST",
      ),
    ).toHaveLength(1);
  });

  it("replaces the empty state with a created review", async () => {
    const createdReview = {
      id: 3,
      professorId: 1,
      rating: 4,
      comment: "Primeira avaliação.",
      createdAt: "2025-01-10T12:00:00.000Z",
      updatedAt: "2025-01-10T12:00:00.000Z",
    };
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      if (url === "/api/professors/1/reviews" && options?.method === "POST") {
        return Promise.resolve({ ok: true, status: 201, json: async () => createdReview });
      }

      if (url === "/api/professors/1/reviews") {
        return Promise.resolve({ ok: true, status: 200, json: async () => [] });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");
    expect(await screen.findByText("Nenhuma avaliação ainda.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nota"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Comentário"), {
      target: { value: "Primeira avaliação." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));

    expect(await screen.findByText("Primeira avaliação.")).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma avaliação ainda.")).not.toBeInTheDocument();
  });

  it.each([
    ["0", "Comentário válido"],
    ["6", "Comentário válido"],
    ["5", "   "],
  ])("rejects invalid review fields locally", async (invalidRating, invalidComment) => {
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      if (url === "/api/professors/1/reviews") {
        return Promise.resolve({ ok: true, status: 200, json: async () => adaReviews });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");
    await screen.findByRole("heading", { name: "Nova avaliação" });
    fireEvent.change(screen.getByLabelText("Nota"), { target: { value: invalidRating } });
    fireEvent.change(screen.getByLabelText("Comentário"), {
      target: { value: invalidComment },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Preencha uma nota de 1 a 5 e um comentário.",
    );
    expect(
      fetchMock.mock.calls.some(
        ([url, options]) => url === "/api/professors/1/reviews" && options?.method === "POST",
      ),
    ).toBe(false);
  });

  it.each(["500 response", "network rejection"])(
    "shows a generic error when review creation has a %s",
    async (label) => {
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      if (url === "/api/professors/1/reviews" && options?.method === "POST") {
        return label === "500 response"
          ? Promise.resolve({ ok: false, status: 500 })
          : Promise.reject(new Error("Network error"));
      }

      if (url === "/api/professors/1/reviews") {
        return Promise.resolve({ ok: true, status: 200, json: async () => adaReviews });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");
    await screen.findByRole("heading", { name: "Nova avaliação" });
    fireEvent.change(screen.getByLabelText("Nota"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Comentário"), {
      target: { value: "Comentário" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível enviar a avaliação.",
    );
    },
  );

  it("shows the generic reviews error for a 500 response", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      if (url === "/api/professors/1/reviews") {
        return Promise.resolve({ ok: false, status: 500 });
      }

      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar as avaliações.",
    );
    expect(screen.queryByLabelText("Resumo das avaliações")).not.toBeInTheDocument();
  });

  it("shows the generic reviews error when the request is rejected", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      if (url === "/api/professors/1/reviews") {
        return Promise.reject(new Error("Network error"));
      }

      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar as avaliações.",
    );
  });

  it("shows the not found state for a 404 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    renderApp("/professors/999999");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Professor não encontrado.",
    );
  });

  it("shows the invalid identifier state for a 400 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400 }));

    renderApp("/professors/abc");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Identificador de professor inválido.",
    );
  });

  it("shows the generic error state for a 500 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    renderApp("/professors/1");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar o professor.",
    );
  });

  it("shows the generic error state when the request is rejected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    renderApp("/professors/1");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar o professor.",
    );
  });

  it("shows an invalid identifier without requesting the API when the route parameter is absent", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <MemoryRouter>
        <ProfessorDetailsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Identificador de professor inválido.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("review filtering and ordering", () => {
  it("starts with newest reviews and resolves equal dates by descending id", async () => {
    stubReviewsFetch(orderedReviews);

    renderApp("/professors/1");
    await screen.findByText("Nota cinco recente de id maior.");

    expect(screen.getByLabelText("Ordenar avaliações")).toHaveValue("newest");
    expectReviewOrder([
      "Nota cinco recente de id maior.",
      "Nota cinco recente de id menor.",
      "Nota um de id maior.",
      "Nota um de id menor.",
      "Nota quatro.",
      "Nota dois.",
      "Nota três mais antiga.",
      "Nota cinco antiga.",
    ]);
  });

  it("orders oldest reviews by ascending date", async () => {
    stubReviewsFetch(orderedReviews);
    renderApp("/professors/1");
    await screen.findByText("Nota cinco recente de id maior.");

    fireEvent.change(screen.getByLabelText("Ordenar avaliações"), {
      target: { value: "oldest" },
    });

    expectReviewOrder([
      "Nota cinco antiga.",
      "Nota três mais antiga.",
      "Nota dois.",
      "Nota quatro.",
      "Nota um de id menor.",
      "Nota um de id maior.",
      "Nota cinco recente de id menor.",
      "Nota cinco recente de id maior.",
    ]);
  });

  it("resolves equal dates in oldest order by ascending id", async () => {
    stubReviewsFetch([orderedReviews[4], orderedReviews[3]]);
    renderApp("/professors/1");
    await screen.findByText("Nota um de id maior.");

    fireEvent.change(screen.getByLabelText("Ordenar avaliações"), {
      target: { value: "oldest" },
    });

    expectReviewOrder(["Nota um de id menor.", "Nota um de id maior."]);
  });

  it("orders by highest rating with date and id as deterministic tiebreakers", async () => {
    stubReviewsFetch(orderedReviews);
    renderApp("/professors/1");
    await screen.findByText("Nota cinco recente de id maior.");

    fireEvent.change(screen.getByLabelText("Ordenar avaliações"), {
      target: { value: "highest-rating" },
    });

    expectReviewOrder([
      "Nota cinco recente de id maior.",
      "Nota cinco recente de id menor.",
      "Nota cinco antiga.",
      "Nota quatro.",
      "Nota três mais antiga.",
      "Nota dois.",
      "Nota um de id maior.",
      "Nota um de id menor.",
    ]);
  });

  it("orders by lowest rating with date and id as deterministic tiebreakers", async () => {
    stubReviewsFetch(orderedReviews);
    renderApp("/professors/1");
    await screen.findByText("Nota cinco recente de id maior.");

    fireEvent.change(screen.getByLabelText("Ordenar avaliações"), {
      target: { value: "lowest-rating" },
    });

    expectReviewOrder([
      "Nota um de id maior.",
      "Nota um de id menor.",
      "Nota dois.",
      "Nota três mais antiga.",
      "Nota quatro.",
      "Nota cinco recente de id maior.",
      "Nota cinco recente de id menor.",
      "Nota cinco antiga.",
    ]);
  });

  it.each([
    ["1", ["Nota um de id maior.", "Nota um de id menor."]],
    ["2", ["Nota dois."]],
    ["3", ["Nota três mais antiga."]],
    ["4", ["Nota quatro."]],
    ["5", [
      "Nota cinco recente de id maior.",
      "Nota cinco recente de id menor.",
      "Nota cinco antiga.",
    ]],
  ])("filters rating %s locally", async (rating, comments) => {
    stubReviewsFetch(orderedReviews);
    renderApp("/professors/1");
    await screen.findByText("Nota cinco recente de id maior.");

    fireEvent.change(screen.getByLabelText("Filtrar por nota"), {
      target: { value: rating },
    });

    expectReviewOrder(comments);
  });

  it("distinguishes a filter without matches from an empty API response", async () => {
    stubReviewsFetch(adaReviews);
    const firstView = renderApp("/professors/1");
    await screen.findByText("Feedbacks úteis durante os exercícios.");

    fireEvent.change(screen.getByLabelText("Filtrar por nota"), {
      target: { value: "1" },
    });

    expect(screen.getByText("Nenhuma avaliação corresponde ao filtro.")).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma avaliação ainda.")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nova avaliação" })).toBeInTheDocument();

    firstView.unmount();
    cleanup();
    stubReviewsFetch([]);
    renderApp("/professors/1");

    expect(await screen.findByText("Nenhuma avaliação ainda.")).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma avaliação corresponde ao filtro.")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Filtrar por nota")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nova avaliação" })).toBeInTheDocument();
  });

  it("keeps the general summary unchanged after filtering", async () => {
    stubReviewsFetch(orderedReviews);
    renderApp("/professors/1");
    await screen.findByText("Nota cinco recente de id maior.");
    const summary = screen.getByLabelText("Resumo das avaliações");

    expect(summary).toHaveTextContent("Resumo geral");
    expect(summary).toHaveTextContent("8 avaliações");
    expect(summary).toHaveTextContent("Média: 3,3/5");

    fireEvent.change(screen.getByLabelText("Filtrar por nota"), {
      target: { value: "5" },
    });

    expect(summary).toHaveTextContent("8 avaliações");
    expect(summary).toHaveTextContent("Média: 3,3/5");
  });

  it("offers accessible options and changes both controls without fetching", async () => {
    const fetchMock = stubReviewsFetch(adaReviews);
    renderApp("/professors/1");
    await screen.findByText("Feedbacks úteis durante os exercícios.");
    const filter = screen.getByLabelText("Filtrar por nota");
    const order = screen.getByLabelText("Ordenar avaliações");

    expect(within(filter).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Todas as notas",
      "Nota 5",
      "Nota 4",
      "Nota 3",
      "Nota 2",
      "Nota 1",
    ]);
    expect(within(order).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Mais recentes",
      "Mais antigas",
      "Maior nota",
      "Menor nota",
    ]);

    fireEvent.change(filter, { target: { value: "4" } });
    fireEvent.change(order, { target: { value: "oldest" } });

    expect(filter).toHaveValue("4");
    expect(order).toHaveValue("oldest");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("resets only the filter after creation and preserves the selected order", async () => {
    const createdReview = {
      id: 3,
      professorId: 1,
      rating: 3,
      comment: "Avaliação recém-criada.",
      createdAt: "2025-01-11T12:00:00.000Z",
      updatedAt: "2025-01-11T12:00:00.000Z",
    };
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }
      if (options?.method === "POST") {
        return Promise.resolve({ ok: true, status: 201, json: async () => createdReview });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => adaReviews });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/professors/1");
    await screen.findByText("Feedbacks úteis durante os exercícios.");

    fireEvent.change(screen.getByLabelText("Filtrar por nota"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Ordenar avaliações"), {
      target: { value: "oldest" },
    });
    fireEvent.change(screen.getByLabelText("Nota"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Comentário"), {
      target: { value: "Avaliação recém-criada." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));

    expect(await screen.findByText("Avaliação recém-criada.")).toBeInTheDocument();
    expect(screen.getByLabelText("Filtrar por nota")).toHaveValue("all");
    expect(screen.getByLabelText("Ordenar avaliações")).toHaveValue("oldest");
    expectReviewOrder([
      "Explicações claras e atividades bem organizadas.",
      "Feedbacks úteis durante os exercícios.",
      "Avaliação recém-criada.",
    ]);
    expect(
      fetchMock.mock.calls.filter(
        ([url, options]) => url === "/api/professors/1/reviews" && options?.method === undefined,
      ),
    ).toHaveLength(1);
  });

  it("resets only the filter after editing and preserves the selected order", async () => {
    const updatedReview = {
      ...adaReviews[0],
      rating: 3,
      comment: "Avaliação com nota editada.",
      updatedAt: "2025-01-11T14:30:00.000Z",
    };
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }
      if (options?.method === "PATCH") {
        return Promise.resolve({ ok: true, status: 200, json: async () => updatedReview });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => adaReviews });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/professors/1");
    await screen.findByText("Explicações claras e atividades bem organizadas.");

    fireEvent.change(screen.getByLabelText("Filtrar por nota"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText("Ordenar avaliações"), {
      target: { value: "oldest" },
    });
    const targetCard = screen
      .getByText("Explicações claras e atividades bem organizadas.")
      .closest("li");
    if (targetCard === null) {
      throw new Error("Review card not found");
    }
    const card = within(targetCard);
    fireEvent.click(card.getByRole("button", { name: "Editar avaliação" }));
    fireEvent.change(card.getByLabelText("Nota"), { target: { value: "3" } });
    fireEvent.change(card.getByLabelText("Comentário"), {
      target: { value: "Avaliação com nota editada." },
    });
    fireEvent.click(card.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Avaliação atualizada com sucesso.",
    );
    expect(screen.getByText("Avaliação com nota editada.")).toBeInTheDocument();
    expect(screen.getByLabelText("Filtrar por nota")).toHaveValue("all");
    expect(screen.getByLabelText("Ordenar avaliações")).toHaveValue("oldest");
    expectReviewOrder([
      "Avaliação com nota editada.",
      "Feedbacks úteis durante os exercícios.",
    ]);
    expect(
      fetchMock.mock.calls.filter(
        ([url, options]) => url === "/api/professors/1/reviews" && options?.method === undefined,
      ),
    ).toHaveLength(1);
  });

  it("preserves filter and order after deletion and shows the filtered empty state", async () => {
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }
      if (options?.method === "DELETE") {
        return Promise.resolve({ ok: true, status: 204 });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => adaReviews });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/professors/1");
    await screen.findByText("Explicações claras e atividades bem organizadas.");

    fireEvent.change(screen.getByLabelText("Filtrar por nota"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText("Ordenar avaliações"), {
      target: { value: "oldest" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Excluir avaliação" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));

    expect(
      await screen.findByText("Nenhuma avaliação corresponde ao filtro."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Filtrar por nota")).toHaveValue("5");
    expect(screen.getByLabelText("Ordenar avaliações")).toHaveValue("oldest");
    expect(screen.getByLabelText("Resumo das avaliações")).toHaveTextContent("1 avaliação");
    expect(
      fetchMock.mock.calls.filter(
        ([url, options]) => url === "/api/professors/1/reviews" && options?.method === undefined,
      ),
    ).toHaveLength(1);
  });

  it("restores the initial controls when professorId changes", async () => {
    const secondProfessorReview = {
      ...adaReviews[0],
      id: 9,
      professorId: 2,
      comment: "Avaliação do segundo professor.",
    };
    const fetchMock = vi.fn((url: string) => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => url === "/api/professors/1/reviews"
        ? adaReviews
        : [secondProfessorReview],
    }));
    vi.stubGlobal("fetch", fetchMock);
    const view = render(<ProfessorReviews professorId={1} />);
    await screen.findByText("Feedbacks úteis durante os exercícios.");

    fireEvent.change(screen.getByLabelText("Filtrar por nota"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Ordenar avaliações"), {
      target: { value: "oldest" },
    });
    view.rerender(<ProfessorReviews professorId={2} />);

    expect(await screen.findByText("Avaliação do segundo professor.")).toBeInTheDocument();
    expect(screen.getByLabelText("Filtrar por nota")).toHaveValue("all");
    expect(screen.getByLabelText("Ordenar avaliações")).toHaveValue("newest");
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/professors/1/reviews",
      "/api/professors/2/reviews",
    ]);
  });
});

describe("review deletion", () => {
  it("opens confirmation and cancelling does not call DELETE", async () => {
    const fetchMock = vi.fn((url: string, _options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      return Promise.resolve({ ok: true, status: 200, json: async () => adaReviews });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");
    await screen.findByText("Feedbacks úteis durante os exercícios.");

    fireEvent.click(screen.getAllByRole("button", { name: "Excluir avaliação" })[0]);
    const confirmation = screen.getByText("Deseja excluir esta avaliação?");
    const card = confirmation.closest("li");

    if (card === null) {
      throw new Error("Review card not found");
    }

    expect(confirmation).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: "Editar avaliação" })).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByText("Deseja excluir esta avaliação?")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === "DELETE")).toBe(false);
  });

  it("deletes a review with the exact URL and signal and recalculates the summary", async () => {
    const deleteResponse = createDeferred<{ ok: boolean; status: number }>();
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      if (url === "/api/professors/1/reviews/1" && options?.method === "DELETE") {
        return deleteResponse.promise;
      }

      return Promise.resolve({ ok: true, status: 200, json: async () => adaReviews });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");
    await screen.findByText("Feedbacks úteis durante os exercícios.");
    const targetCard = screen
      .getByText("Explicações claras e atividades bem organizadas.")
      .closest("li");
    if (targetCard === null) {
      throw new Error("Review card not found");
    }
    fireEvent.click(within(targetCard).getByRole("button", { name: "Excluir avaliação" }));
    const confirmButton = screen.getByRole("button", { name: "Confirmar exclusão" });

    act(() => {
      confirmButton.click();
      confirmButton.click();
    });

    expect(screen.getByRole("button", { name: "Excluindo..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    const deletingCard = screen.getByText("Deseja excluir esta avaliação?").closest("li");
    if (deletingCard === null) {
      throw new Error("Review card not found");
    }
    expect(
      within(deletingCard).queryByRole("button", { name: "Editar avaliação" }),
    ).not.toBeInTheDocument();
    const deleteCall = fetchMock.mock.calls.find(
      ([url, options]) => url === "/api/professors/1/reviews/1" && options?.method === "DELETE",
    );
    expect(deleteCall?.[1]).toMatchObject({ method: "DELETE", signal: expect.any(AbortSignal) });
    expect(
      fetchMock.mock.calls.filter(([, options]) => options?.method === "DELETE"),
    ).toHaveLength(1);

    deleteResponse.resolve({ ok: true, status: 204 });
    await screen.findByText("1 avaliação");
    expect(screen.queryByText("Explicações claras e atividades bem organizadas.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Resumo das avaliações")).toHaveTextContent("Média: 4,0/5");
    expect(
      fetchMock.mock.calls.filter(
        ([url, options]) =>
          url === "/api/professors/1/reviews" && options?.method !== "DELETE",
      ),
    ).toHaveLength(1);
  });

  it("shows the empty state after deleting the last review", async () => {
    const onlyReview = [adaReviews[0]];
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      if (options?.method === "DELETE") {
        return Promise.resolve({ ok: true, status: 204 });
      }

      return Promise.resolve({ ok: true, status: 200, json: async () => onlyReview });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");
    await screen.findByText("Explicações claras e atividades bem organizadas.");
    fireEvent.click(screen.getByRole("button", { name: "Excluir avaliação" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));

    expect(await screen.findByText("Nenhuma avaliação ainda.")).toBeInTheDocument();
    expect(screen.getByLabelText("Resumo das avaliações")).toHaveTextContent("0 avaliações");
    expect(screen.getByLabelText("Resumo das avaliações")).toHaveTextContent("Sem média");
  });

  it.each([
    ["404 response", () => Promise.resolve({ ok: false, status: 404 })],
    ["500 response", () => Promise.resolve({ ok: false, status: 500 })],
    ["network rejection", () => Promise.reject(new Error("Network error"))],
  ])("shows a deletion alert for a %s", async (_label, deleteResult) => {
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      if (options?.method === "DELETE") {
        return deleteResult();
      }

      return Promise.resolve({ ok: true, status: 200, json: async () => adaReviews });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");
    await screen.findByText("Feedbacks úteis durante os exercícios.");
    fireEvent.click(screen.getAllByRole("button", { name: "Excluir avaliação" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível excluir a avaliação.",
    );
  });

  it("clears a previous deletion error when cancelling", async () => {
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      if (options?.method === "DELETE") {
        return Promise.resolve({ ok: false, status: 404 });
      }

      return Promise.resolve({ ok: true, status: 200, json: async () => adaReviews });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");
    await screen.findByText("Feedbacks úteis durante os exercícios.");
    fireEvent.click(screen.getAllByRole("button", { name: "Excluir avaliação" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível excluir a avaliação.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Deseja excluir esta avaliação?")).not.toBeInTheDocument();
  });

  it("aborts a pending deletion when the component unmounts", async () => {
    const deleteResponse = createDeferred<{ ok: boolean; status: number }>();
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      if (options?.method === "DELETE") {
        return deleteResponse.promise;
      }

      return Promise.resolve({ ok: true, status: 200, json: async () => adaReviews });
    });
    vi.stubGlobal("fetch", fetchMock);

    const view = renderApp("/professors/1");
    await screen.findByText("Feedbacks úteis durante os exercícios.");
    fireEvent.click(screen.getAllByRole("button", { name: "Excluir avaliação" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    const deleteCall = fetchMock.mock.calls.find(([, options]) => options?.method === "DELETE");
    const signal = deleteCall?.[1]?.signal;

    expect(signal?.aborted).toBe(false);
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });
});

describe("review timestamps", () => {
  it.each([
    "2025-01-10T12:00:00.000Z",
    "2025-01-09T12:00:00.000Z",
  ])("shows creation in UTC and hides a non-later update (%s)", async (updatedAt) => {
    vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => url === "/api/professors/1"
        ? ada
        : [{ ...adaReviews[0], updatedAt }],
    })));

    renderApp("/professors/1");

    expect(await screen.findByText(/Criada em:/))
      .toHaveTextContent("Criada em: 10/01/2025, 12:00 UTC");
    expect(screen.getByText("10/01/2025, 12:00 UTC"))
      .toHaveAttribute("datetime", adaReviews[0].createdAt);
    expect(screen.queryByText(/Atualizada em:/)).not.toBeInTheDocument();
  });

  it("shows a later update in UTC", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => url === "/api/professors/1"
        ? ada
        : [{ ...adaReviews[0], updatedAt: "2025-01-11T14:30:00.000Z" }],
    })));

    renderApp("/professors/1");

    expect(await screen.findByText(/Atualizada em:/))
      .toHaveTextContent("Atualizada em: 11/01/2025, 14:30 UTC");
    expect(screen.getByText(/Criada em:/))
      .toHaveTextContent("Criada em: 10/01/2025, 12:00 UTC");
  });
});

describe("review editing", () => {
  function getFirstReviewCard() {
    const card = screen
      .getByText("Explicações claras e atividades bem organizadas.")
      .closest("li");

    if (card === null) {
      throw new Error("Review card not found");
    }

    return within(card);
  }

  it("opens with current values and cancelling restores them without PATCH", async () => {
    const fetchMock = vi.fn((url: string, _options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      return Promise.resolve({ ok: true, status: 200, json: async () => adaReviews });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");
    await screen.findByText("Explicações claras e atividades bem organizadas.");
    let card = getFirstReviewCard();
    fireEvent.click(card.getByRole("button", { name: "Editar avaliação" }));

    expect(card.getByLabelText("Nota")).toHaveValue(5);
    expect(card.getByLabelText("Comentário")).toHaveValue(
      "Explicações claras e atividades bem organizadas.",
    );
    expect(card.queryByRole("button", { name: "Excluir avaliação" })).not.toBeInTheDocument();
    expect(card.queryByText("Deseja excluir esta avaliação?")).not.toBeInTheDocument();
    fireEvent.change(card.getByLabelText("Nota"), { target: { value: "2" } });
    fireEvent.change(card.getByLabelText("Comentário"), {
      target: { value: "Rascunho" },
    });
    fireEvent.click(card.getByRole("button", { name: "Cancelar edição" }));

    card = getFirstReviewCard();
    fireEvent.click(card.getByRole("button", { name: "Editar avaliação" }));
    expect(card.getByLabelText("Nota")).toHaveValue(5);
    expect(card.getByLabelText("Comentário")).toHaveValue(
      "Explicações claras e atividades bem organizadas.",
    );
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === "PATCH")).toBe(false);
  });

  it.each([
    ["0", "Comentário válido"],
    ["6", "Comentário válido"],
    ["1.5", "Comentário válido"],
    ["5", "   "],
  ])("rejects invalid local edit values", async (rating, comment) => {
    const fetchMock = vi.fn((url: string, _options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      return Promise.resolve({ ok: true, status: 200, json: async () => adaReviews });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");
    await screen.findByText("Explicações claras e atividades bem organizadas.");
    const card = getFirstReviewCard();
    fireEvent.click(card.getByRole("button", { name: "Editar avaliação" }));
    fireEvent.change(card.getByLabelText("Nota"), { target: { value: rating } });
    fireEvent.change(card.getByLabelText("Comentário"), { target: { value: comment } });
    fireEvent.click(card.getByRole("button", { name: "Salvar alterações" }));

    expect(card.getByRole("alert")).toHaveTextContent(
      "Preencha uma nota de 1 a 5 e um comentário.",
    );
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === "PATCH")).toBe(false);
  });

  it("updates once with exact request data and recalculates the average without a new GET", async () => {
    const patchResponse = createDeferred<{
      ok: boolean;
      status: number;
      json: () => Promise<typeof adaReviews[number]>;
    }>();
    const updatedReview = {
      id: 1,
      professorId: 1,
      rating: 3,
      comment: "Comentário atualizado.",
      createdAt: "2025-01-10T12:00:00.000Z",
      updatedAt: "2025-01-11T14:30:00.000Z",
    };
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      if (options?.method === "PATCH") {
        return patchResponse.promise;
      }

      return Promise.resolve({ ok: true, status: 200, json: async () => adaReviews });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");
    await screen.findByText("Explicações claras e atividades bem organizadas.");
    const card = getFirstReviewCard();
    fireEvent.click(card.getByRole("button", { name: "Editar avaliação" }));
    fireEvent.change(card.getByLabelText("Nota"), { target: { value: "3" } });
    fireEvent.change(card.getByLabelText("Comentário"), {
      target: { value: "  Comentário atualizado.  " },
    });
    const saveButton = card.getByRole("button", { name: "Salvar alterações" });

    act(() => {
      saveButton.click();
      saveButton.click();
    });

    expect(card.getByLabelText("Nota")).toBeDisabled();
    expect(card.getByLabelText("Comentário")).toBeDisabled();
    expect(card.getByRole("button", { name: "Salvando..." })).toBeDisabled();
    expect(card.getByRole("button", { name: "Cancelar edição" })).toBeDisabled();
    const patchCalls = fetchMock.mock.calls.filter(
      ([url, options]) =>
        url === "/api/professors/1/reviews/1" && options?.method === "PATCH",
    );
    expect(patchCalls).toHaveLength(1);
    expect(patchCalls[0]?.[1]).toMatchObject({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      signal: expect.any(AbortSignal),
    });
    expect(JSON.parse(String(patchCalls[0]?.[1]?.body))).toStrictEqual({
      rating: 3,
      comment: "  Comentário atualizado.  ",
    });

    patchResponse.resolve({ ok: true, status: 200, json: async () => updatedReview });

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Avaliação atualizada com sucesso.",
    );
    expect(screen.getByText("Comentário atualizado.")).toBeInTheDocument();
    expect(card.getByText(/Criada em:/)).toHaveTextContent("Criada em: 10/01/2025, 12:00 UTC");
    expect(card.getByText(/Atualizada em:/)).toHaveTextContent("Atualizada em: 11/01/2025, 14:30 UTC");
    expect(screen.getByText("Nota: 3/5")).toBeInTheDocument();
    expect(screen.getByLabelText("Resumo das avaliações")).toHaveTextContent("Média: 3,5/5");
    expect(
      fetchMock.mock.calls.filter(
        ([url, options]) =>
          url === "/api/professors/1/reviews" && options?.method === undefined,
      ),
    ).toHaveLength(1);
  });

  it.each([
    ["400 response", () => Promise.resolve({ ok: false, status: 400 })],
    ["404 response", () => Promise.resolve({ ok: false, status: 404 })],
    ["500 response", () => Promise.resolve({ ok: false, status: 500 })],
    ["network rejection", () => Promise.reject(new Error("Network error"))],
  ])("shows an edit alert for a %s", async (_label, patchResult) => {
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      if (options?.method === "PATCH") {
        return patchResult();
      }

      return Promise.resolve({ ok: true, status: 200, json: async () => adaReviews });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");
    await screen.findByText("Explicações claras e atividades bem organizadas.");
    const card = getFirstReviewCard();
    fireEvent.click(card.getByRole("button", { name: "Editar avaliação" }));
    fireEvent.click(card.getByRole("button", { name: "Salvar alterações" }));

    expect(await card.findByRole("alert")).toHaveTextContent(
      "Não foi possível editar a avaliação.",
    );
  });

  it("clears an edit error when cancelling", async () => {
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      if (options?.method === "PATCH") {
        return Promise.resolve({ ok: false, status: 400 });
      }

      return Promise.resolve({ ok: true, status: 200, json: async () => adaReviews });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");
    await screen.findByText("Explicações claras e atividades bem organizadas.");
    const card = getFirstReviewCard();
    fireEvent.click(card.getByRole("button", { name: "Editar avaliação" }));
    fireEvent.click(card.getByRole("button", { name: "Salvar alterações" }));
    expect(await card.findByRole("alert")).toBeInTheDocument();

    fireEvent.click(card.getByRole("button", { name: "Cancelar edição" }));
    expect(card.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("aborts a pending PATCH when unmounted", async () => {
    const patchResponse = createDeferred<{ ok: boolean; status: number }>();
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url === "/api/professors/1") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ada });
      }

      if (options?.method === "PATCH") {
        return patchResponse.promise;
      }

      return Promise.resolve({ ok: true, status: 200, json: async () => adaReviews });
    });
    vi.stubGlobal("fetch", fetchMock);

    const view = renderApp("/professors/1");
    await screen.findByText("Explicações claras e atividades bem organizadas.");
    const card = getFirstReviewCard();
    fireEvent.click(card.getByRole("button", { name: "Editar avaliação" }));
    fireEvent.click(card.getByRole("button", { name: "Salvar alterações" }));
    const patchCall = fetchMock.mock.calls.find(([, options]) => options?.method === "PATCH");
    const signal = patchCall?.[1]?.signal;

    expect(signal?.aborted).toBe(false);
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });
});
