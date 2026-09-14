import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { ModerationPage } from "./ModerationPage.js";

const apiFetch = vi.hoisted(() => vi.fn());
const currentUser = vi.hoisted(() => ({ id: 99, name: "Moderação", email: "mod@test.local", role: "moderator" as const, course: null }));

vi.mock("../auth/AuthContext.js", () => ({
  useAuth: () => ({ apiFetch, user: currentUser }),
}));

const review = {
  id: 10, status: "pending", rating: 4.5, comment: "Boa revisão pendente.", createdAt: "2026-09-14T12:00:00.000Z",
  author: { id: 4, name: "Ana", email: "ana@test.local" }, professor: { id: 1, name: "Ada Ribeiro" }, discipline: null,
  ratings: { didactics: 5, clarity: 4, punctuality: 4, availability: 5 },
};

const report = {
  id: 7, reviewId: 10, reason: "Linguagem inadequada", status: "pending", createdAt: "2026-09-14T12:00:00.000Z",
  reporter: { id: 5, name: "Bruno", email: "bruno@test.local" },
  review: { ...review, professor: undefined, discipline: undefined },
  professor: { id: 1, name: "Ada Ribeiro" }, discipline: null,
};

const users = [
  { id: 99, name: "Moderação", email: "mod@test.local", role: "moderator", blocked: false, course: null },
  { id: 4, name: "Ana", email: "ana@test.local", role: "student", blocked: false, course: { id: 1, name: "Computação" } },
];

function response(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); apiFetch.mockReset(); });

describe("ModerationPage", () => {
  it("loads independent tabs and applies actions locally without a new GET", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    apiFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") return response({ id: 10, status: "published" });
      if (url === "/api/moderation/reviews?status=pending") return response([review]);
      if (url === "/api/moderation/reports?status=pending") return response([report]);
      if (url === "/api/moderation/users" || url === "/api/moderation/users?search=ana") return response(users);
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<ModerationPage />);
    expect((await screen.findAllByText("Boa revisão pendente."))[0]).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith("/api/moderation/reviews?status=pending", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(apiFetch).toHaveBeenCalledWith("/api/moderation/reports?status=pending", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(apiFetch).toHaveBeenCalledWith("/api/moderation/users", expect.objectContaining({ signal: expect.any(AbortSignal) }));

    fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    expect(await screen.findByText("Nenhuma avaliação pendente.")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith("/api/moderation/reviews/10", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "published" }) }));
    expect(apiFetch.mock.calls.filter(([url, init]) => url === "/api/moderation/reviews?status=pending" && !init?.method)).toHaveLength(1);

    fireEvent.click(screen.getByRole("tab", { name: "Denúncias" }));
    expect(await screen.findByText("Linguagem inadequada")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(await screen.findByText("Nenhuma denúncia pendente.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Usuários" }));
    expect(await screen.findByText("ana@test.local")).toBeInTheDocument();
    const moderatorCard = screen.getByText("mod@test.local").closest("article");
    expect(within(moderatorCard!).getByRole("button", { name: "Bloquear" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Buscar por nome ou e-mail"), { target: { value: "ana" } });
    expect(apiFetch.mock.calls.filter(([url]) => url === "/api/moderation/users")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(apiFetch).toHaveBeenLastCalledWith("/api/moderation/users?search=ana", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });
});
