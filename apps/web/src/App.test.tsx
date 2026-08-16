import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { App } from "./App.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("shows loading before rendering professors returned by the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 1, name: "Ada Ribeiro" },
        { id: 2, name: "Caio Nogueira" },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(screen.getByText("Carregando...")).toBeInTheDocument();
    expect(await screen.findByText("Ada Ribeiro")).toBeInTheDocument();
    expect(screen.getByText("Caio Nogueira")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/professors");
  });

  it("shows an empty state when the API returns no professors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    render(<App />);

    expect(await screen.findByText("Nenhum professor encontrado.")).toBeInTheDocument();
  });

  it("shows an error state when the API request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os professores.",
    );
  });
});
