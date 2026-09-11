import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";

import { App } from "./App.js";

const departments = [
  { id: 1, name: "Departamento Aurora" },
  { id: 2, name: "Departamento Horizonte" },
];
const courses = [
  { id: 1, name: "Computação Aplicada", departmentId: 1, department: "Departamento Aurora" },
  { id: 2, name: "Sistemas Digitais", departmentId: 2, department: "Departamento Horizonte" },
];
const discipline = {
  id: 1,
  code: "CMP101",
  name: "Fundamentos de Programação",
  workloadHours: 64,
  department: departments[0],
  courses: [{ id: 1, name: "Computação Aplicada" }],
};
const disciplineDetails = {
  ...discipline,
  professors: [{ id: 1, name: "Ada Ribeiro" }],
};

function LocationObserver() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function renderApp(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <App />
      <LocationObserver />
    </MemoryRouter>,
  );
}

function HistoryControls() {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => void navigate(-1)}>Histórico anterior</button>
      <button type="button" onClick={() => void navigate(1)}>Histórico seguinte</button>
    </>
  );
}

function successfulCatalogFetch(disciplines = [discipline]) {
  const fetchMock = vi.fn((url: string) => {
    if (url === "/api/departments") return Promise.resolve({ ok: true, json: async () => departments });
    if (url === "/api/courses") return Promise.resolve({ ok: true, json: async () => courses });
    if (url.startsWith("/api/disciplines")) return Promise.resolve({ ok: true, json: async () => disciplines });
    throw new Error(`Unexpected URL: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("academic catalog pages", () => {
  it("shows the responsive main navigation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    renderApp("/");

    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Professores" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Disciplinas" })).toHaveAttribute("href", "/disciplines");
  });

  it("loads list cards without individual requests and keeps typing local", async () => {
    const fetchMock = successfulCatalogFetch();
    renderApp("/disciplines");

    expect(screen.getByText("Carregando disciplinas...")).toBeInTheDocument();
    expect(await screen.findByText("Fundamentos de Programação")).toBeInTheDocument();
    expect(screen.getByText("CMP101")).toBeInTheDocument();
    expect(screen.getByText("Departamento Aurora · 64 horas")).toBeInTheDocument();
    expect(screen.getAllByText("Computação Aplicada")).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    fireEvent.change(screen.getByLabelText("Buscar por nome ou código"), { target: { value: "prog" } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([url]) => url)).not.toContain("/api/disciplines/1");
  });

  it("submits canonical combined filters and restores them from the URL", async () => {
    const fetchMock = successfulCatalogFetch();
    renderApp("/disciplines?unknown=x&search=%20prog%20&departmentId=1&courseId=2");

    await screen.findByText("Fundamentos de Programação");
    expect(screen.getByLabelText("Buscar por nome ou código")).toHaveValue("prog");
    expect(screen.getByLabelText("Departamento")).toHaveValue("1");
    expect(screen.getByLabelText("Curso")).toHaveValue("2");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/disciplines?search=prog&departmentId=1&courseId=2",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/disciplines?unknown=x&search=%20prog%20&departmentId=1&courseId=2",
    );

    fireEvent.change(screen.getByLabelText("Buscar por nome ou código"), { target: { value: "dados" } });
    fireEvent.submit(screen.getByRole("button", { name: "Aplicar filtros" }).closest("form")!);
    expect(await screen.findByTestId("location")).toHaveTextContent(
      "/disciplines?search=dados&departmentId=1&courseId=2",
    );
  });

  it("restores discipline filters when navigating backward and forward", async () => {
    successfulCatalogFetch();
    render(
      <MemoryRouter
        initialEntries={["/disciplines?search=estrutura", "/disciplines?search=dados"]}
        initialIndex={1}
      >
        <App />
        <HistoryControls />
      </MemoryRouter>,
    );

    await screen.findByText("Fundamentos de Programação");
    expect(screen.getByLabelText("Buscar por nome ou código")).toHaveValue("dados");
    fireEvent.click(screen.getByRole("button", { name: "Histórico anterior" }));
    expect(await screen.findByDisplayValue("estrutura")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Histórico seguinte" }));
    expect(await screen.findByDisplayValue("dados")).toBeInTheDocument();
  });

  it.each([
    ["empty", [], "Nenhuma disciplina encontrada."],
    ["error", null, "Não foi possível carregar as disciplinas."],
  ])("shows the %s list state", async (_label, result, message) => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/departments") return Promise.resolve({ ok: true, json: async () => departments });
      if (url === "/api/courses") return Promise.resolve({ ok: true, json: async () => courses });
      return Promise.resolve({ ok: result !== null, json: async () => result });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/disciplines");

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it("shows details, professor links, and a return link preserving filters", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => disciplineDetails });
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/disciplines/1?search=prog&departmentId=1&unknown=x");

    expect(screen.getByText("Carregando disciplina...")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Fundamentos de Programação" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ada Ribeiro" })).toHaveAttribute("href", "/professors/1");
    expect(screen.getByRole("link", { name: "Voltar para disciplinas" })).toHaveAttribute(
      "href",
      "/disciplines?search=prog&departmentId=1",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/disciplines/1", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it.each([
    ["404", 404, "Disciplina não encontrada."],
    ["error", 500, "Não foi possível carregar a disciplina."],
  ])("shows the details %s state", async (_label, status, message) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status }));
    renderApp("/disciplines/999");
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it("rejects an invalid route id without fetching", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderApp("/disciplines/abc");

    expect(screen.getByText("Identificador de disciplina inválido.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("aborts a pending discipline details request on cleanup", () => {
    let requestSignal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) => {
      requestSignal = init?.signal ?? undefined;
      return new Promise(() => undefined);
    }));
    const view = renderApp("/disciplines/1");

    expect(requestSignal?.aborted).toBe(false);
    view.unmount();
    expect(requestSignal?.aborted).toBe(true);
  });
});
