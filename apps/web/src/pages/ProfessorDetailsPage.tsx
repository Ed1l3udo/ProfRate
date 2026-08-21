import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import { ProfessorReviews } from "../components/ProfessorReviews.js";
import type { ProfessorDetails } from "../types/professor.js";

type LoadState = "loading" | "success" | "not-found" | "invalid-id" | "error";

export function ProfessorDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [professor, setProfessor] = useState<ProfessorDetails | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    if (id === undefined) {
      setProfessor(null);
      setLoadState("invalid-id");
      return;
    }

    const controller = new AbortController();

    setProfessor(null);
    setLoadState("loading");

    async function loadProfessor() {
      try {
        const response = await fetch(`/api/professors/${id}`, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        if (response.status === 400) {
          setLoadState("invalid-id");
          return;
        }

        if (response.status === 404) {
          setLoadState("not-found");
          return;
        }

        if (!response.ok) {
          setLoadState("error");
          return;
        }

        const data = (await response.json()) as ProfessorDetails;

        if (controller.signal.aborted) {
          return;
        }

        setProfessor(data);
        setLoadState("success");
      } catch {
        if (!controller.signal.aborted) {
          setLoadState("error");
        }
      }
    }

    void loadProfessor();

    return () => {
      controller.abort();
    };
  }, [id]);

  if (loadState === "loading") {
    return <p>Carregando professor...</p>;
  }

  if (loadState === "success" && professor !== null) {
    return (
      <main>
        <h1>{professor.name}</h1>
        <p>Departamento: {professor.department}</p>
        <ProfessorReviews professorId={professor.id} />
        <Link to="/">Voltar para a lista</Link>
      </main>
    );
  }

  const message =
    loadState === "invalid-id"
      ? "Identificador de professor inválido."
      : loadState === "not-found"
        ? "Professor não encontrado."
        : "Não foi possível carregar o professor.";

  return (
    <main>
      <p role="alert">{message}</p>
      <Link to="/">Voltar para a lista</Link>
    </main>
  );
}
