import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";

import { useAuth, type AuthUser } from "../auth/AuthContext.js";
import type { Course } from "../types/discipline.js";

export function SignupPage() {
  const { apiFetch, saveSession, status } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [courseId, setCourseId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
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
  }, [apiFetch]);

  if (status === "authenticated") return <Navigate to="/" replace />;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await apiFetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, courseId: Number(courseId) }),
      });
      const body = await response.json() as {
        user?: AuthUser;
        token?: string;
        error?: { code?: string };
      };

      if (!response.ok || body.user === undefined || body.token === undefined) {
        setFeedback(body.error?.code === "EMAIL_ALREADY_REGISTERED"
          ? "Este e-mail já está cadastrado."
          : body.error?.code === "COURSE_NOT_FOUND"
            ? "O curso selecionado não existe."
            : "Revise nome, e-mail, senha e curso.");
        return;
      }

      saveSession(body.user, body.token);
      void navigate("/", { replace: true });
    } catch {
      setFeedback("Não foi possível criar a conta agora.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell auth-page">
      <h1>Criar conta</h1>
      <p className="page-intro">Conta local e fictícia para demonstração.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="signup-name">Nome</label>
        <input id="signup-name" autoComplete="name" value={name}
          onChange={(event) => setName(event.target.value)} />
        <label htmlFor="signup-email">E-mail</label>
        <input id="signup-email" type="email" autoComplete="email" value={email}
          onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="signup-password">Senha</label>
        <input id="signup-password" type="password" autoComplete="new-password" value={password}
          aria-describedby="signup-password-help"
          onChange={(event) => setPassword(event.target.value)} />
        <small id="signup-password-help">Use ao menos 8 caracteres, uma letra e um número.</small>
        <label htmlFor="signup-course">Curso</label>
        <select id="signup-course" value={courseId}
          onChange={(event) => setCourseId(event.target.value)}>
          <option value="">Selecione um curso</option>
          {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
        </select>
        <button type="submit" disabled={isSubmitting || courses.length === 0}>
          {isSubmitting ? "Criando conta..." : "Criar conta"}
        </button>
        {feedback !== null ? <p className="form-feedback" role="alert">{feedback}</p> : null}
      </form>
      <p>Já possui conta? <Link to="/login">Entrar</Link></p>
    </main>
  );
}
