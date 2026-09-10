import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";

import type { ProfessorListItem } from "../types/professor.js";
import {
  createProfessorSearchParams,
  readProfessorFilters,
} from "../utils/professorFilters.js";

type LoadState = "loading" | "success" | "error";

const averageRatingFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function ProfessorsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const appliedFilters = readProfessorFilters(searchParams);
  const appliedSearch = appliedFilters.search;
  const appliedDepartment = appliedFilters.department;
  const canonicalSearchParams = createProfessorSearchParams({
    search: appliedSearch,
    department: appliedDepartment,
  }).toString();
  const [professors, setProfessors] = useState<ProfessorListItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [searchInput, setSearchInput] = useState("");
  const [departmentInput, setDepartmentInput] = useState("");

  useEffect(() => {
    setSearchInput(appliedSearch);
    setDepartmentInput(appliedDepartment);
  }, [appliedDepartment, appliedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadState("loading");

    async function loadProfessors() {
      try {
        const url = canonicalSearchParams === ""
          ? "/api/professors"
          : `/api/professors?${canonicalSearchParams}`;
        const response = await fetch(url, { signal: controller.signal });

        if (controller.signal.aborted) {
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to load professors.");
        }

        const data = (await response.json()) as ProfessorListItem[];

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
  }, [canonicalSearchParams]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedFilters = {
      search: searchInput.trim(),
      department: departmentInput.trim(),
    };
    const nextSearchParams = createProfessorSearchParams(normalizedFilters);
    const nextCanonicalSearchParams = nextSearchParams.toString();

    setSearchInput(normalizedFilters.search);
    setDepartmentInput(normalizedFilters.department);

    if (searchParams.toString() !== nextCanonicalSearchParams) {
      setSearchParams(nextSearchParams);
    }
  }

  function handleClearFilters() {
    setSearchInput("");
    setDepartmentInput("");

    if (searchParams.toString() !== "") {
      setSearchParams(new URLSearchParams());
    }
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
              to={
                canonicalSearchParams === ""
                  ? `/professors/${professor.id}`
                  : `/professors/${professor.id}?${canonicalSearchParams}`
              }
            >
              <span>{professor.name}</span>
              <small>{professor.department}</small>
            </Link>
            <div
              className="professor-review-summary"
              role="group"
              aria-label={`Resumo de avaliações de ${professor.name}`}
            >
              {professor.reviewCount === 0 ? (
                <span>Sem avaliações</span>
              ) : (
                <>
                  <span>
                    {professor.reviewCount}{" "}
                    {professor.reviewCount === 1 ? "avaliação" : "avaliações"}
                  </span>
                  {professor.averageRating !== null ? (
                    <span>
                      Média: {averageRatingFormatter.format(professor.averageRating)}/5
                    </span>
                  ) : null}
                </>
              )}
            </div>
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
