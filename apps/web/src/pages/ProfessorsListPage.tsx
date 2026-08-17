import { useEffect, useState } from "react";
import { Link } from "react-router";

import type { ProfessorSummary } from "../types/professor.js";

type LoadState = "loading" | "success" | "error";

export function ProfessorsListPage() {
  const [professors, setProfessors] = useState<ProfessorSummary[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    async function loadProfessors() {
      try {
        const response = await fetch("/api/professors");

        if (!response.ok) {
          throw new Error("Unable to load professors.");
        }

        const data = (await response.json()) as ProfessorSummary[];

        setProfessors(data);
        setLoadState("success");
      } catch {
        setLoadState("error");
      }
    }

    void loadProfessors();
  }, []);

  if (loadState === "loading") {
    return <p>Carregando...</p>;
  }

  if (loadState === "error") {
    return <p role="alert">Não foi possível carregar os professores.</p>;
  }

  if (professors.length === 0) {
    return <p>Nenhum professor encontrado.</p>;
  }

  return (
    <main>
      <h1>Professores</h1>
      <ul>
        {professors.map((professor) => (
          <li key={professor.id}>
            <Link to={`/professors/${professor.id}`}>{professor.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
