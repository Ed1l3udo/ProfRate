import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { useAuth } from "../../auth/AuthContext.js";
import { isAbortError, responseError, type ModerationUser } from "./moderation.js";
import { SectionError } from "./ModerationReviewsSection.js";

export function ModerationUsersSection() {
  const { apiFetch, user: currentUser } = useAuth();
  const [users, setUsers] = useState<ModerationUser[]>([]); const [search, setSearch] = useState(""); const [submittedSearch, setSubmittedSearch] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading"); const [error, setError] = useState(""); const [workingId, setWorkingId] = useState<number | null>(null);
  const loadController = useRef<AbortController | null>(null); const actionControllers = useRef(new Map<number, AbortController>());
  const load = (nextSearch = submittedSearch) => {
    loadController.current?.abort(); const controller = new AbortController(); loadController.current = controller; setState("loading"); setError("");
    const query = nextSearch?.trim(); const suffix = query ? `?search=${encodeURIComponent(query)}` : "";
    void apiFetch(`/api/moderation/users${suffix}`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error(await responseError(response, "Não foi possível carregar os usuários."));
      const data = await response.json() as ModerationUser[]; if (!controller.signal.aborted) { setUsers(data); setState("ready"); }
    }).catch((loadError: unknown) => { if (!controller.signal.aborted && !isAbortError(loadError)) { setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os usuários."); setState("error"); } });
  };
  useEffect(() => { load(null); return () => { loadController.current?.abort(); actionControllers.current.forEach((controller) => controller.abort()); }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const submitSearch = (event: FormEvent) => { event.preventDefault(); const next = search.trim() || null; setSubmittedSearch(next); load(next); };
  const updateBlocked = async (candidate: ModerationUser) => {
    if (candidate.id === currentUser?.id || workingId !== null || actionControllers.current.has(candidate.id)) return;
    const blocking = !candidate.blocked;
    if (blocking && !window.confirm(`Bloquear a conta de ${candidate.name}?`)) return;
    const controller = new AbortController(); actionControllers.current.set(candidate.id, controller); setWorkingId(candidate.id); setError("");
    try {
      const response = await apiFetch(`/api/moderation/users/${candidate.id}/${blocking ? "block" : "unblock"}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}", signal: controller.signal });
      if (!response.ok) throw new Error(await responseError(response, "Não foi possível atualizar o bloqueio."));
      const updated = await response.json() as ModerationUser;
      if (!controller.signal.aborted) setUsers((items) => items.map((item) => item.id === candidate.id ? { ...item, ...updated } : item));
    } catch (actionError) { if (!controller.signal.aborted && !isAbortError(actionError)) setError(actionError instanceof Error ? actionError.message : "Não foi possível atualizar o bloqueio."); }
    finally { actionControllers.current.delete(candidate.id); if (!controller.signal.aborted) setWorkingId((id) => id === candidate.id ? null : id); }
  };
  return <>
    <form className="moderation-search" onSubmit={submitSearch}><label htmlFor="moderation-user-search">Buscar por nome ou e-mail</label><div><input id="moderation-user-search" value={search} onChange={(event) => setSearch(event.target.value)} /><button>Buscar</button></div></form>
    {state === "loading" ? <p className="inline-state">Carregando usuários...</p> : null}
    {state === "error" ? <SectionError message={error} retry={() => load()} /> : null}
    {state === "ready" && users.length === 0 ? <p className="inline-state">Nenhum usuário encontrado.</p> : null}
    {state === "ready" ? <>{error ? <p className="inline-error" role="alert">{error}</p> : null}<div className="moderation-list">{users.map((candidate) => { const self = candidate.id === currentUser?.id; const working = workingId === candidate.id; return <article className="moderation-card moderation-user" key={candidate.id}><div><h3>{candidate.name}</h3><p>{candidate.email}</p><p className="moderation-meta">{candidate.role === "moderator" ? "Moderador" : "Estudante"}{candidate.course ? ` · ${candidate.course.name}` : ""} · {candidate.blocked ? "Bloqueado" : "Ativo"}</p></div><button className={candidate.blocked ? "" : "danger-button"} disabled={self || working} title={self ? "Você não pode bloquear a própria conta." : undefined} onClick={() => void updateBlocked(candidate)}>{candidate.blocked ? "Desbloquear" : "Bloquear"}</button></article>; })}</div></> : null}
  </>;
}
