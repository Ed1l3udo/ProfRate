import { useEffect, useState } from "react";
import { Link } from "react-router";

import type { ProfessorSummary } from "../types/professor.js";

type LoadState = "loading" | "success" | "error";

type ProfessorFilters = {
  search: string;
  department: string;
};

const emptyFilters: ProfessorFilters = { search: "", department: "" };

export function ProfessorsListPage() {
  const [professors, setProfessors] = useState<ProfessorSummary[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [searchInput, setSearchInput] = useState("");
  const [departmentInput, setDepartmentInput] = useState("");
  const [filters, setFilters] = useState<ProfessorFilters>(emptyFilters);

  useEffect(() => {
    const controller = new AbortController();
    setLoadState("loading");

    async function loadProfessors() {
      try {
        const searchParams = new URLSearchParams();

        if (filters.search !== "") {
          searchParams.set("search", filters.search);
        }

        if (filters.department !== "") {
          searchParams.set("department", filters.department);
        }

        const query = searchParams.toString();
        const url = query === "" ? "/api/professors" : `/api/professors?${query}`;
        const response = await fetch(url, { signal: controller.signal });

        if (controller.signal.aborted) {
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to load professors.");
        }

        const data = (await response.json()) as ProfessorSummary[];

        if (controller.signal.aborted) {
          return;
        }

        setProfessors(data);
        setLoadState("success");
      } catch {
        if (!controller.signal.aborted) {
          setLoadState("error");
        }
      }
    }

    void loadProfessors();

    return () => {
      controller.abort();
    };
  }, [filters]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({
      search: searchInput.trim(),
      department: departmentInput.trim(),
    });
  }

  function handleClearFilters() {
    setSearchInput("");
    setDepartmentInput("");
    setFilters({ ...emptyFilters });
  }

  if (loadState === "loading") {
    return <p className="state-message">Carregando...</p>;
  }

  if (loadState === "error") {
    return <p className="state-message" role="alert">Não foi possível carregar os professores.</p>;
  }

  if (professors.length === 0) {
    return (
      <main className="page-shell">
        <ProfessorFiltersForm
          search={searchInput}
          department={departmentInput}
          onSearchChange={setSearchInput}
          onDepartmentChange={setDepartmentInput}
          onSubmit={handleSubmit}
          onClear={handleClearFilters}
        />
        <p className="state-message">Nenhum professor encontrado.</p>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">ProfRate</p>
        <h1>Professores</h1>
        <p className="page-intro">Consulte professores e conheça as avaliações fictícias.</p>
      </header>
      <ProfessorFiltersForm
        search={searchInput}
        department={departmentInput}
        onSearchChange={setSearchInput}
        onDepartmentChange={setDepartmentInput}
        onSubmit={handleSubmit}
        onClear={handleClearFilters}
      />
      <ul className="professor-list">
        {professors.map((professor) => (
          <li className="professor-card" key={professor.id}>
            <Link
              className="professor-card-link"
              aria-label={professor.name}
              to={`/professors/${professor.id}`}
            >
              <span>{professor.name}</span>
              <small>{professor.department}</small>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function ProfessorFiltersForm({
  search,
  department,
  onSearchChange,
  onDepartmentChange,
  onSubmit,
  onClear,
}: {
  search: string;
  department: string;
  onSearchChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
}) {
  return (
    <form className="professor-filters" onSubmit={onSubmit}>
      <div className="filter-field">
        <label htmlFor="professor-search">Buscar por nome</label>
        <input
          id="professor-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <div className="filter-field">
        <label htmlFor="professor-department">Filtrar por departamento</label>
        <input
          id="professor-department"
          type="search"
          value={department}
          onChange={(event) => onDepartmentChange(event.target.value)}
        />
      </div>
      <div className="filter-actions">
        <button type="submit">Buscar</button>
        <button type="button" onClick={onClear}>
          Limpar filtros
        </button>
      </div>
    </form>
  );
}
