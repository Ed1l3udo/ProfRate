import { useEffect, useRef, useState } from "react";

import { useAuth } from "../../auth/AuthContext.js";
import { isAbortError, responseError, targetLabel, type ModerationReport } from "./moderation.js";
import { SectionError } from "./ModerationReviewsSection.js";

export function ModerationReportsSection() {
  const { apiFetch } = useAuth();
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState(""); const [workingId, setWorkingId] = useState<number | null>(null);
  const loadController = useRef<AbortController | null>(null); const actionControllers = useRef(new Map<number, AbortController>());
  const load = () => {
    loadController.current?.abort(); const controller = new AbortController(); loadController.current = controller; setState("loading"); setError("");
    void apiFetch("/api/moderation/reports?status=pending", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error(await responseError(response, "Não foi possível carregar as denúncias."));
      const data = await response.json() as ModerationReport[]; if (!controller.signal.aborted) { setReports(data); setState("ready"); }
    }).catch((loadError: unknown) => { if (!controller.signal.aborted && !isAbortError(loadError)) { setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as denúncias."); setState("error"); } });
  };
  useEffect(() => { load(); return () => { loadController.current?.abort(); actionControllers.current.forEach((controller) => controller.abort()); }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const resolve = async (report: ModerationReport, status: "resolved" | "dismissed") => {
    if (workingId !== null || actionControllers.current.has(report.id)) return;
    if (!window.confirm(status === "resolved" ? "Resolver esta denúncia?" : "Descartar esta denúncia?")) return;
    const controller = new AbortController(); actionControllers.current.set(report.id, controller); setWorkingId(report.id); setError("");
    try {
      const response = await apiFetch(`/api/moderation/reports/${report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }), signal: controller.signal });
      if (!response.ok) throw new Error(await responseError(response, "Não foi possível atualizar a denúncia."));
      if (!controller.signal.aborted) setReports((items) => items.filter((item) => item.id !== report.id));
    } catch (actionError) { if (!controller.signal.aborted && !isAbortError(actionError)) setError(actionError instanceof Error ? actionError.message : "Não foi possível atualizar a denúncia."); }
    finally { actionControllers.current.delete(report.id); if (!controller.signal.aborted) setWorkingId((id) => id === report.id ? null : id); }
  };
  if (state === "loading") return <p className="inline-state">Carregando denúncias...</p>;
  if (state === "error") return <SectionError message={error} retry={load} />;
  if (reports.length === 0) return <p className="inline-state">Nenhuma denúncia pendente.</p>;
  return <>{error ? <p className="inline-error" role="alert">{error}</p> : null}<div className="moderation-list">{reports.map((report) => {
    const review = report.review; const working = workingId === report.id;
    return <article className="moderation-card" key={report.id}><div className="moderation-card-heading"><h3>Denúncia #{report.id}</h3><span>Review #{report.reviewId}</span></div><p><strong>Denunciante:</strong> {report.reporter.name} ({report.reporter.email})</p><p><strong>Motivo:</strong> {report.reason}</p>{review ? <><p><strong>{targetLabel({ ...review, professor: report.professor ?? null, discipline: report.discipline ?? null })}</strong></p><p>{review.comment}</p></> : <p className="moderation-meta">Os detalhes da avaliação não estão mais disponíveis.</p>}<div className="moderation-actions"><button disabled={working} onClick={() => void resolve(report, "resolved")}>Resolver</button><button disabled={working} onClick={() => void resolve(report, "dismissed")}>Descartar</button></div></article>;
  })}</div></>;
}
