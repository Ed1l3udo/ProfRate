import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import { App } from "./App.js";
import { ProfessorDetailsPage } from "./pages/ProfessorDetailsPage.js";

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
  },
  {
    id: 2,
    professorId: 1,
    rating: 4,
    comment: "Feedbacks úteis durante os exercícios.",
  },
];

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
    expect(screen.getByText("Deseja excluir esta avaliação?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

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
    fireEvent.click(screen.getAllByRole("button", { name: "Excluir avaliação" })[0]);
    const confirmButton = screen.getByRole("button", { name: "Confirmar exclusão" });

    act(() => {
      confirmButton.click();
      confirmButton.click();
    });

    expect(screen.getByRole("button", { name: "Excluindo..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
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
