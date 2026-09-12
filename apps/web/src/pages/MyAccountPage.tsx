import { useEffect, useState } from "react";

import { useAuth, type AuthUser } from "../auth/AuthContext.js";
import type { Course } from "../types/discipline.js";

export function MyAccountPage() {
  const { apiFetch, updateUser, user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [name, setName] = useState(user?.name ?? "");
  const [courseId, setCourseId] = useState(user?.course?.id.toString() ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "student") return;
    const controller = new AbortController();
    apiFetch("/api/courses", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = (await response.json()) as Course[];
        if (!controller.signal.aborted) setCourses(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFeedback("Não foi possível carregar os cursos.");
      });
    return () => controller.abort();
  }, [apiFetch, user?.role]);

  if (user === null) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || user === null) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const body = user.role === "student"
        ? { name, courseId: Number(courseId) }
        : { name };
      const response = await apiFetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setFeedback("Não foi possível atualizar a conta.");
        return;
      }

      const updated = (await response.json()) as AuthUser;
      updateUser(updated);
      setName(updated.name);
      setCourseId(updated.course?.id.toString() ?? "");
      setFeedback("Conta atualizada com sucesso.");
    } catch {
      setFeedback("Não foi possível atualizar a conta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell auth-page">
      <h1>Minha conta</h1>
      <dl className="account-summary">
        <div><dt>E-mail</dt><dd>{user.email}</dd></div>
        <div><dt>Perfil</dt><dd>{user.role === "student" ? "Aluno" : "Moderador"}</dd></div>
        <div><dt>Curso</dt><dd>{user.course?.name ?? "Não vinculado"}</dd></div>
      </dl>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="account-name">Nome</label>
        <input id="account-name" value={name} onChange={(event) => setName(event.target.value)} />
        {user.role === "student" ? (
          <>
            <label htmlFor="account-course">Curso</label>
            <select id="account-course" value={courseId}
              onChange={(event) => setCourseId(event.target.value)}>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
            </select>
          </>
        ) : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar alterações"}
        </button>
        {feedback !== null ? <p className="form-feedback" role="status">{feedback}</p> : null}
      </form>
    </main>
  );
}
