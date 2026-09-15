import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { AdminPage } from "./AdminPage.js";

const apiFetch = vi.hoisted(() => vi.fn());

vi.mock("../auth/AuthContext.js", () => ({ useAuth: () => ({ apiFetch }) }));

function response(body: unknown, status = 200) {
  return Promise.resolve(new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); apiFetch.mockReset(); });

describe("AdminPage", () => {
  it("loads all four areas, creates locally, handles conflict, and protects duplicate removal", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    apiFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST" && url === "/api/admin/departments") return response({ id: 2, name: "Departamento Novo" }, 201);
      if (init?.method === "DELETE") return response(null, 409);
      if (url === "/api/admin/departments") return response([{ id: 1, name: "Departamento Inicial" }]);
      if (url === "/api/admin/courses") return response([{ id: 1, name: "Curso Inicial", department: { id: 1, name: "Departamento Inicial" } }]);
      if (url === "/api/admin/disciplines") return response([{ id: 1, code: "INI101", name: "Disciplina Inicial", workloadHours: 40, department: { id: 1, name: "Departamento Inicial" }, courses: [{ id: 1, name: "Curso Inicial" }] }]);
      if (url === "/api/admin/professors") return response([{ id: 1, name: "Professora Inicial", department: { id: 1, name: "Departamento Inicial" }, disciplines: [{ id: 1, name: "Disciplina Inicial" }] }]);
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<AdminPage />);
    expect(await screen.findByText("Departamento Inicial")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith("/api/admin/professors", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    fireEvent.click(screen.getByRole("button", { name: "Criar departamento" }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: " Departamento Novo " } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Departamento Novo")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith("/api/admin/departments", expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "Departamento Novo" }) }));

    fireEvent.click(screen.getByRole("tab", { name: "Cursos" }));
    expect(await screen.findByText("Curso Inicial")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Disciplinas" }));
    expect(await screen.findByText("INI101 — Disciplina Inicial")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Professores" }));
    expect(await screen.findByText("Professora Inicial")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("conflita");
  });
});
