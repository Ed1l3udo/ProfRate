import { useEffect, useState } from "react";

type Professor = {
  id: number;
  name: string;
};

type LoadState = "loading" | "success" | "error";

export function App() {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    async function loadProfessors() {
      try {
        const response = await fetch("/api/professors");

        if (!response.ok) {
          throw new Error("Unable to load professors.");
        }

        const data = (await response.json()) as Professor[];

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
          <li key={professor.id}>{professor.name}</li>
        ))}
      </ul>
    </main>
  );
}
