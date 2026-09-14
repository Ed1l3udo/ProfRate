import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

import { ReviewItem } from "./components/ReviewItem.js";

vi.mock("./auth/AuthContext.js", () => ({
  useAuth: () => ({
    apiFetch: vi.fn(),
    status: "authenticated",
    user: { id: 1, role: "student", isBlocked: true },
  }),
}));

afterEach(cleanup);

it("does not expose edit, deletion or reporting actions to a blocked student", () => {
  render(
    <MemoryRouter>
      <ReviewItem
        review={{
          id: 1,
          professorId: 1,
          disciplineId: null,
          targetType: "professor",
          rating: 4,
          ratings: { didactics: 4, clarity: 4, punctuality: 4, availability: 4 },
          comment: "Avaliação própria bloqueada.",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          status: "published",
          canManage: true,
        }}
        onDeleted={vi.fn()}
        onUpdated={vi.fn()}
      />
    </MemoryRouter>,
  );

  expect(screen.queryByRole("button", { name: "Editar avaliação" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Excluir avaliação" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Denunciar avaliação" })).not.toBeInTheDocument();
});
