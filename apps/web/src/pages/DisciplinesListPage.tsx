import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";

import type { Course, Department, DisciplineListItem } from "../types/discipline.js";
import {
  createDisciplineSearchParams,
  readDisciplineFilters,
  type DisciplineFilters,
} from "../utils/disciplineFilters.js";

type LoadState = "loading" | "success" | "error";

export function DisciplinesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const appliedFilters = readDisciplineFilters(searchParams);
  const canonicalSearchParams = createDisciplineSearchParams(appliedFilters).toString();
  const [inputs, setInputs] = useState<DisciplineFilters>(appliedFilters);
  const [disciplines, setDisciplines] = useState<DisciplineListItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [optionsState, setOptionsState] = useState<LoadState>("loading");

  useEffect(() => setInputs(appliedFilters), [
    appliedFilters.search,
    appliedFilters.departmentId,
    appliedFilters.courseId,
  ]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOptions() {
      try {
        const [departmentsResponse, coursesResponse] = await Promise.all([
          fetch("/api/departments", { signal: controller.signal }),
          fetch("/api/courses", { signal: controller.signal }),
        ]);

        if (!departmentsResponse.ok || !coursesResponse.ok) throw new Error();
        const [departmentData, courseData] = await Promise.all([
          departmentsResponse.json() as Promise<Department[]>,
          coursesResponse.json() as Promise<Course[]>,
        ]);

        if (!controller.signal.aborted) {
          setDepartments(departmentData);
          setCourses(courseData);
          setOptionsState("success");
        }
      } catch {
        if (!controller.signal.aborted) setOptionsState("error");
      }
    }

    void loadOptions();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoadState("loading");

    async function loadDisciplines() {
      try {
        const url = canonicalSearchParams === ""
          ? "/api/disciplines"
          : `/api/disciplines?${canonicalSearchParams}`;
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) throw new Error();
        const data = (await response.json()) as DisciplineListItem[];

        if (!controller.signal.aborted) {
          setDisciplines(data);
          setLoadState("success");
        }
      } catch {
        if (!controller.signal.aborted) setLoadState("error");
      }
    }

    void loadDisciplines();
    return () => controller.abort();
  }, [canonicalSearchParams]);

  function updateInput(name: keyof DisciplineFilters, value: string) {
    setInputs((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = createDisciplineSearchParams(inputs);
    const normalized = readDisciplineFilters(next);
    setInputs(normalized);

    if (searchParams.toString() !== next.toString()) setSearchParams(next);
  }

  function handleClear() {
    const empty = { search: "", departmentId: "", courseId: "" };
    setInputs(empty);
    if (searchParams.toString() !== "") setSearchParams(new URLSearchParams());
  }

  const controlsDisabled = optionsState === "loading";

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">ProfRate</p>
        <h1>Disciplinas</h1>
        <p className="page-intro">Explore o catálogo acadêmico fictício.</p>
      </header>
      <form className="catalog-filters" onSubmit={handleSubmit}>
        <div className="filter-field">
          <label htmlFor="discipline-search">Buscar por nome ou código</label>
          <input id="discipline-search" type="search" value={inputs.search}
            onChange={(event) => updateInput("search", event.target.value)} />
        </div>
        <div className="filter-field">
          <label htmlFor="discipline-department">Departamento</label>
          <select id="discipline-department" value={inputs.departmentId} disabled={controlsDisabled}
            onChange={(event) => updateInput("departmentId", event.target.value)}>
            <option value="">Todos os departamentos</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="discipline-course">Curso</label>
          <select id="discipline-course" value={inputs.courseId} disabled={controlsDisabled}
            onChange={(event) => updateInput("courseId", event.target.value)}>
            <option value="">Todos os cursos</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
          </select>
        </div>
        <div className="filter-actions">
          <button type="submit">Aplicar filtros</button>
          <button type="button" onClick={handleClear}>Limpar filtros</button>
        </div>
      </form>
      {optionsState === "error" ? <p className="inline-error" role="alert">Não foi possível carregar as opções de filtro.</p> : null}
      {loadState === "loading" ? <p className="inline-state">Carregando disciplinas...</p> : null}
      {loadState === "error" ? <p className="inline-state" role="alert">Não foi possível carregar as disciplinas.</p> : null}
      {loadState === "success" && disciplines.length === 0 ? <p className="inline-state">Nenhuma disciplina encontrada.</p> : null}
      {loadState === "success" && disciplines.length > 0 ? (
        <ul className="discipline-list">
          {disciplines.map((discipline) => (
            <li className="discipline-card" key={discipline.id}>
              <p className="discipline-code">{discipline.code}</p>
              <h2>{discipline.name}</h2>
              <p>{discipline.department.name} · {discipline.workloadHours} horas</p>
              <p>{discipline.courses.length === 0 ? "Sem cursos relacionados" : discipline.courses.map(({ name }) => name).join(", ")}</p>
              <Link to={canonicalSearchParams === "" ? `/disciplines/${discipline.id}` : `/disciplines/${discipline.id}?${canonicalSearchParams}`}>
                Ver detalhes
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
