import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";

import { App } from "./App.js";

const student = {
  id: 7,
  name: "Ana Exemplo",
  email: "ana@student.profrate.test",
  role: "student" as const,
  course: { id: 1, name: "Computação Aplicada" },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function LocationObserver() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderApp(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
      <LocationObserver />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("authentication flows", () => {
  it("returns to a protected destination after login, authenticates requests and logs out", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/auth/login") {
        return Promise.resolve(jsonResponse({ user: student, token: "login-token" }));
      }
      if (url === "/api/me/reviews") {
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer login-token");
        return Promise.resolve(jsonResponse([]));
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/my-reviews");

    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: " ANA@STUDENT.PROFRATE.TEST " },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "ProfRate#2026Aluno" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("heading", { name: "Minhas avaliações" })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/my-reviews");
    expect(await screen.findByText("Você ainda não publicou avaliações.")).toBeInTheDocument();
    expect(sessionStorage.getItem("profrate.authToken")).toBe("login-token");

    fireEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(sessionStorage.getItem("profrate.authToken")).toBeNull();
    expect(screen.getByRole("link", { name: "Entrar" })).toBeInTheDocument();
  });

  it("creates an account with a course and starts the new session", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/courses") {
        return Promise.resolve(jsonResponse([{ id: 1, name: "Computação Aplicada" }]));
      }
      if (url === "/api/auth/signup") {
        expect(JSON.parse(String(init?.body))).toStrictEqual({
          name: "Nova Aluna",
          email: "nova@example.test",
          password: "Senha123",
          courseId: 1,
        });
        return Promise.resolve(jsonResponse({ user: student, token: "signup-token" }, 201));
      }
      if (url === "/api/professors") {
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer signup-token");
        return Promise.resolve(jsonResponse([]));
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/signup");

    await screen.findByRole("option", { name: "Computação Aplicada" });
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Nova Aluna" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "nova@example.test" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "Senha123" } });
    fireEvent.change(screen.getByLabelText("Curso"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText("Nenhum professor encontrado.")).toBeInTheDocument();
    expect(screen.getByText("Ana Exemplo")).toBeInTheDocument();
    expect(sessionStorage.getItem("profrate.authToken")).toBe("signup-token");
  });

  it("restores a session and only exposes actions for reviews owned by the student", async () => {
    sessionStorage.setItem("profrate.authToken", "restored-token");
    const reviews = [
      {
        id: 1,
        professorId: 1,
        rating: 5,
        comment: "Minha avaliação.",
        createdAt: "2026-01-01T12:00:00.000Z",
        updatedAt: "2026-01-01T12:00:00.000Z",
        canManage: true,
      },
      {
        id: 2,
        professorId: 1,
        rating: 4,
        comment: "Avaliação de outra pessoa.",
        createdAt: "2026-01-02T12:00:00.000Z",
        updatedAt: "2026-01-02T12:00:00.000Z",
        canManage: false,
      },
    ];
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer restored-token");
      if (url === "/api/me") return Promise.resolve(jsonResponse(student));
      if (url === "/api/professors/1") {
        return Promise.resolve(jsonResponse({ id: 1, name: "Ada Ribeiro", department: "Aurora" }));
      }
      if (url === "/api/professors/1/reviews" && init?.method === "POST") {
        return Promise.resolve(jsonResponse({
          id: 3,
          professorId: 1,
          rating: 5,
          comment: "Nova avaliação autenticada.",
          createdAt: "2026-01-03T12:00:00.000Z",
          updatedAt: "2026-01-03T12:00:00.000Z",
          canManage: true,
        }, 201));
      }
      if (url === "/api/professors/1/reviews") return Promise.resolve(jsonResponse(reviews));
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");

    const ownCard = (await screen.findByText("Minha avaliação.")).closest("li");
    const otherCard = screen.getByText("Avaliação de outra pessoa.").closest("li");
    expect(ownCard).not.toBeNull();
    expect(otherCard).not.toBeNull();
    expect(within(ownCard!).getByRole("button", { name: "Editar avaliação" })).toBeInTheDocument();
    expect(within(otherCard!).queryByRole("button", { name: "Editar avaliação" })).not.toBeInTheDocument();
    expect(screen.getByText("Ana Exemplo")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nota", { selector: "input" }), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText("Comentário", { selector: "textarea" }), {
      target: { value: "Nova avaliação autenticada." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));
    expect(await screen.findByText("Nova avaliação autenticada.")).toBeInTheDocument();
  });

  it("keeps public reviews visible to visitors without exposing a write form", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/professors/1") {
        return Promise.resolve(jsonResponse({ id: 1, name: "Ada Ribeiro", department: "Aurora" }));
      }
      if (url === "/api/professors/1/reviews") {
        return Promise.resolve(jsonResponse([{
          id: 1,
          professorId: 1,
          rating: 5,
          comment: "Avaliação antiga e pública.",
          createdAt: "2025-01-01T12:00:00.000Z",
          updatedAt: "2025-01-01T12:00:00.000Z",
          canManage: false,
        }]));
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/professors/1");

    expect(await screen.findByText("Avaliação antiga e pública.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Nova avaliação" })).not.toBeInTheDocument();
    expect(screen.getByText(/para publicar uma avaliação/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar avaliação" })).not.toBeInTheDocument();
  });

  it("shows and updates the editable account fields without exposing the token", async () => {
    sessionStorage.setItem("profrate.authToken", "account-token");
    const updatedStudent = { ...student, name: "Ana Atualizada" };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer account-token");
      if (url === "/api/me" && init?.method === "PATCH") {
        expect(JSON.parse(String(init.body))).toStrictEqual({ name: "Ana Atualizada", courseId: 1 });
        return Promise.resolve(jsonResponse(updatedStudent));
      }
      if (url === "/api/me") return Promise.resolve(jsonResponse(student));
      if (url === "/api/courses") {
        return Promise.resolve(jsonResponse([{ id: 1, name: "Computação Aplicada" }]));
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/account");

    expect(await screen.findByRole("heading", { name: "Minha conta" })).toBeInTheDocument();
    expect(screen.getByText("ana@student.profrate.test")).toBeInTheDocument();
    expect(screen.queryByText("account-token")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana Atualizada" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(await screen.findByText("Conta atualizada com sucesso.")).toBeInTheDocument();
    expect(screen.getByText("Ana Atualizada")).toBeInTheDocument();
  });

  it("clears the session only when a 401 identifies an invalid token", async () => {
    sessionStorage.setItem("profrate.authToken", "expired-token");
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/me") return Promise.resolve(jsonResponse(student));
      if (url === "/api/professors") {
        return Promise.resolve(jsonResponse({ error: { code: "INVALID_AUTH_TOKEN" } }, 401));
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    renderApp("/");

    await waitFor(() => expect(sessionStorage.getItem("profrate.authToken")).toBeNull());
    expect(screen.getByRole("link", { name: "Entrar" })).toBeInTheDocument();
  });
});
