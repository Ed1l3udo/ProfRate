import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";

import type { DisciplineDetails } from "../types/discipline.js";
import { createDisciplineSearchParams, readDisciplineFilters } from "../utils/disciplineFilters.js";

type LoadState = "loading" | "success" | "not-found" | "invalid-id" | "error";

export function DisciplineDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const returnParams = createDisciplineSearchParams(
    readDisciplineFilters(new URLSearchParams(location.search)),
  ).toString();
  const returnTo = returnParams === "" ? "/disciplines" : `/disciplines?${returnParams}`;
  const [discipline, setDiscipline] = useState<DisciplineDetails | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    if (id === undefined || !/^[1-9]\d*$/.test(id) || Number(id) > 2_147_483_647) {
      setDiscipline(null);
      setLoadState("invalid-id");
      return;
    }

    const controller = new AbortController();
    setDiscipline(null);
    setLoadState("loading");

    async function loadDiscipline() {
      try {
        const response = await fetch(`/api/disciplines/${id}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (response.status === 404) return setLoadState("not-found");
        if (response.status === 400) return setLoadState("invalid-id");
        if (!response.ok) return setLoadState("error");
        const data = (await response.json()) as DisciplineDetails;

        if (!controller.signal.aborted) {
          setDiscipline(data);
          setLoadState("success");
        }
      } catch {
        if (!controller.signal.aborted) setLoadState("error");
      }
    }

    void loadDiscipline();
    return () => controller.abort();
  }, [id]);

  if (loadState === "success" && discipline !== null) {
    return (
      <main className="page-shell">
        <p className="discipline-code">{discipline.code}</p>
        <h1>{discipline.name}</h1>
        <dl className="discipline-metadata">
          <div><dt>Departamento</dt><dd>{discipline.department.name}</dd></div>
          <div><dt>Carga horária</dt><dd>{discipline.workloadHours} horas</dd></div>
        </dl>
        <section className="related-section">
          <h2>Cursos relacionados</h2>
          {discipline.courses.length === 0 ? <p>Nenhum curso relacionado.</p> : (
            <ul>{discipline.courses.map((course) => <li key={course.id}>{course.name}</li>)}</ul>
          )}
        </section>
        <section className="related-section">
          <h2>Professores relacionados</h2>
          {discipline.professors.length === 0 ? <p>Nenhum professor relacionado.</p> : (
            <ul>{discipline.professors.map((professor) => (
              <li key={professor.id}><Link to={`/professors/${professor.id}`}>{professor.name}</Link></li>
            ))}</ul>
          )}
        </section>
        <Link className="back-link" to={returnTo}>Voltar para disciplinas</Link>
      </main>
    );
  }

  const message = loadState === "loading"
    ? "Carregando disciplina..."
    : loadState === "invalid-id"
      ? "Identificador de disciplina inválido."
      : loadState === "not-found"
        ? "Disciplina não encontrada."
        : "Não foi possível carregar a disciplina.";

  return (
    <main className="page-shell">
      <p className="inline-state" role={loadState === "loading" ? undefined : "alert"}>{message}</p>
      {loadState !== "loading" ? <Link className="back-link" to={returnTo}>Voltar para disciplinas</Link> : null}
    </main>
  );
}
