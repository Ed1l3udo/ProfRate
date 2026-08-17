import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("professors list", () => {
  it("shows links to the professor details pages", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 1, name: "Ada Ribeiro" },
        { id: 2, name: "Caio Nogueira" },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/");

    expect(screen.getByText("Carregando...")).toBeInTheDocument();
    expect(await screen.findByText("Ada Ribeiro")).toBeInTheDocument();
    expect(screen.getByText("Caio Nogueira")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/professors");
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
});

describe("professor details", () => {
  it("shows loading before rendering a professor and uses the id URL with an abort signal", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 1,
        name: "Ada Ribeiro",
        department: "Departamento Aurora",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");

    expect(screen.getByText("Carregando professor...")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Ada Ribeiro" })).toBeInTheDocument();
    expect(screen.getByText("Departamento: Departamento Aurora")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para a lista" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(fetchMock.mock.calls[0][0]).toBe("/api/professors/1");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ signal: expect.anything() });
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
