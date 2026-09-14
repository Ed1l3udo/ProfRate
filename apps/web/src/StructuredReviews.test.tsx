import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

import { ReviewsSection } from "./components/ProfessorReviews.js";
import { MyReviewsPage } from "./pages/MyReviewsPage.js";

const apiFetch = vi.hoisted(() => vi.fn());

vi.mock("./auth/AuthContext.js", () => ({
  useAuth: () => ({
    apiFetch,
    status: "authenticated",
    user: { id: 1, role: "student" },
  }),
}));

const timestamp = "2026-01-10T12:00:00.000Z";
const disciplineReview = {
  id: 4,
  professorId: null,
  disciplineId: 1,
  targetType: "discipline" as const,
  rating: 4,
  ratings: { difficulty: 3, relevance: 5, workload: 4 },
  comment: "Conteúdo bem distribuído.",
  createdAt: timestamp,
  updatedAt: timestamp,
  canManage: true,
};

afterEach(() => {
  cleanup();
  apiFetch.mockReset();
});

describe("structured reviews", () => {
  it("renders discipline criteria and filters decimal averages by explicit band", async () => {
    const lowerBandReview = {
      ...disciplineReview,
      id: 5,
      rating: 3.67,
      ratings: { difficulty: 3, relevance: 4, workload: 4 },
      comment: "Média na faixa de três.",
    };
    apiFetch.mockResolvedValue({ ok: true, json: async () => [disciplineReview, lowerBandReview] });

    render(<MemoryRouter><ReviewsSection target={{ targetType: "discipline", targetId: 1 }} /></MemoryRouter>);

    expect(await screen.findByText("Conteúdo bem distribuído.")).toBeInTheDocument();
    expect(screen.getAllByText("Dificuldade")).not.toHaveLength(0);
    expect(screen.getAllByText("Relevância")).not.toHaveLength(0);
    expect(screen.getAllByText("Carga de trabalho")).not.toHaveLength(0);
    expect(screen.queryByText("Didática")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filtrar por nota"), { target: { value: "4" } });
    expect(screen.getByText("Conteúdo bem distribuído.")).toBeInTheDocument();
    expect(screen.queryByText("Média na faixa de três.")).not.toBeInTheDocument();
  });

  it("validates every discipline criterion and sends only ratings plus comment", async () => {
    apiFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ status: 201, json: async () => disciplineReview });
    render(<MemoryRouter><ReviewsSection target={{ targetType: "discipline", targetId: 1 }} /></MemoryRouter>);
    await screen.findByText("Nenhuma avaliação ainda.");

    fireEvent.change(screen.getByLabelText("Dificuldade"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Relevância"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Comentário"), { target: { value: "Conteúdo bem distribuído." } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));
    expect(screen.getByRole("alert")).toHaveTextContent("todos os critérios");
    expect(apiFetch).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("Carga de trabalho"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));
    expect(await screen.findByText("Conteúdo bem distribuído.")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenLastCalledWith("/api/disciplines/1/reviews", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ ratings: { difficulty: 3, relevance: 5, workload: 4 }, comment: "Conteúdo bem distribuído." }),
    }));
  });

  it("links professor and discipline reviews to the correct targets in My Reviews", async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1,
          professorId: 1,
          disciplineId: null,
          targetType: "professor",
          rating: 4.5,
          ratings: { didactics: 5, clarity: 4, punctuality: 5, availability: 4 },
          comment: "Avaliação do professor.",
          createdAt: timestamp,
          updatedAt: timestamp,
          canManage: true,
          professor: { id: 1, name: "Ada Ribeiro" },
        },
        { ...disciplineReview, discipline: { id: 1, code: "CMP101", name: "Fundamentos de Programação" } },
      ],
    });

    render(<MemoryRouter><MyReviewsPage /></MemoryRouter>);
    const list = await screen.findByRole("list");
    expect(within(list).getByRole("link", { name: "Ada Ribeiro" })).toHaveAttribute("href", "/professors/1");
    expect(within(list).getByRole("link", { name: "CMP101 — Fundamentos de Programação" })).toHaveAttribute("href", "/disciplines/1");
    expect(list).toHaveTextContent("Professor:");
    expect(list).toHaveTextContent("Disciplina:");
  });
});
