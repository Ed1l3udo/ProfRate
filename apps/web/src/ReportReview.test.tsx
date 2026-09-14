import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReportReview } from "./components/ReportReview.js";

const apiFetch = vi.hoisted(() => vi.fn());
const auth = vi.hoisted(() => ({
  status: "authenticated" as "authenticated" | "anonymous",
  user: { id: 1, role: "student", isBlocked: false } as { id: number; role: "student"; isBlocked: boolean } | null,
}));

vi.mock("./auth/AuthContext.js", () => ({
  useAuth: () => ({ ...auth, apiFetch }),
}));

const review = {
  id: 12,
  professorId: 1,
  disciplineId: null,
  targetType: "professor" as const,
  rating: 4,
  ratings: { didactics: 4, clarity: 4, punctuality: 4, availability: 4 },
  comment: "Avaliação pública de outra pessoa.",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  canManage: false,
  status: "published" as const,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

afterEach(() => {
  cleanup();
  apiFetch.mockReset();
  auth.status = "authenticated";
  auth.user = { id: 1, role: "student", isBlocked: false };
});

describe("ReportReview", () => {
  it.each([
    ["anonymous", { ...review }, "anonymous", { id: 1, role: "student", isBlocked: false }],
    ["blocked", { ...review }, "authenticated", { id: 1, role: "student", isBlocked: true }],
    ["own", { ...review, canManage: true }, "authenticated", { id: 1, role: "student", isBlocked: false }],
    ["pending", { ...review, status: "pending" as const }, "authenticated", { id: 1, role: "student", isBlocked: false }],
  ])("does not expose reporting for %s reviews or sessions", (_label, currentReview, status, user) => {
    auth.status = status as "authenticated" | "anonymous";
    auth.user = user as { id: number; role: "student"; isBlocked: boolean };
    render(<ReportReview review={currentReview} />);
    expect(screen.queryByRole("button", { name: "Denunciar avaliação" })).not.toBeInTheDocument();
  });

  it("opens, cancels and posts the trimmed reason exactly once without a review GET", async () => {
    const response = deferred<{ status: number }>();
    apiFetch.mockReturnValue(response.promise);
    render(<ReportReview review={review} />);

    fireEvent.click(screen.getByRole("button", { name: "Denunciar avaliação" }));
    fireEvent.change(screen.getByLabelText("Motivo da denúncia"), { target: { value: "  Motivo verificável.  " } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Enviar esta denúncia para a moderação?")).toBeInTheDocument();

    const confirm = screen.getByRole("button", { name: "Confirmar denúncia" });
    act(() => { confirm.click(); confirm.click(); });
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith("/api/reviews/12/reports", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ reason: "Motivo verificável." }),
      signal: expect.any(AbortSignal),
    }));
    expect(screen.getByRole("button", { name: "Enviando..." })).toBeDisabled();

    response.resolve({ status: 201 });
    expect(await screen.findByRole("status")).toHaveTextContent("Denúncia enviada");
    expect(apiFetch.mock.calls.some(([url, init]) => String(url).includes("/reviews") && init?.method === undefined)).toBe(false);
  });

  it("keeps the form available after duplicate feedback and aborts pending work on unmount", async () => {
    apiFetch.mockResolvedValueOnce({ status: 409 });
    const view = render(<ReportReview review={review} />);
    fireEvent.click(screen.getByRole("button", { name: "Denunciar avaliação" }));
    fireEvent.change(screen.getByLabelText("Motivo da denúncia"), { target: { value: "Duplicada." } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar denúncia" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("já denunciou");
    expect(screen.getByLabelText("Motivo da denúncia")).toHaveValue("Duplicada.");

    const pending = deferred<{ status: number }>();
    apiFetch.mockReturnValueOnce(pending.promise);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar denúncia" }));
    const signal = apiFetch.mock.calls.at(-1)?.[1]?.signal as AbortSignal;
    expect(signal.aborted).toBe(false);
    view.unmount();
    expect(signal.aborted).toBe(true);
  });
});
