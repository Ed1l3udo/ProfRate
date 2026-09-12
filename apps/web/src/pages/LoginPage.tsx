import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";

import { useAuth, type AuthUser } from "../auth/AuthContext.js";

export function LoginPage() {
  const { apiFetch, saveSession, status } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const destination = typeof location.state === "object" && location.state !== null &&
    "from" in location.state && typeof location.state.from === "string"
    ? location.state.from
    : "/";

  if (status === "authenticated") return <Navigate to={destination} replace />;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json() as {
        user?: AuthUser;
        token?: string;
        error?: { code?: string };
      };

      if (!response.ok || body.user === undefined || body.token === undefined) {
        setFeedback(body.error?.code === "USER_BLOCKED"
          ? "Esta conta está bloqueada."
          : body.error?.code === "INVALID_LOGIN_INPUT"
            ? "Informe um e-mail e uma senha válidos."
            : "E-mail ou senha inválidos.");
        return;
      }

      saveSession(body.user, body.token);
      void navigate(destination, { replace: true });
    } catch {
      setFeedback("Não foi possível entrar agora.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell auth-page">
      <h1>Entrar</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="login-email">E-mail</label>
        <input id="login-email" type="email" autoComplete="email" value={email}
          onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="login-password">Senha</label>
        <input id="login-password" type="password" autoComplete="current-password" value={password}
          onChange={(event) => setPassword(event.target.value)} />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Entrando..." : "Entrar"}
        </button>
        {feedback !== null ? <p className="form-feedback" role="alert">{feedback}</p> : null}
      </form>
      <p>Não possui conta? <Link to="/signup">Criar conta</Link></p>
    </main>
  );
}
