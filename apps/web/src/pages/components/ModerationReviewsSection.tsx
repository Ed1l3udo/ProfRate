import { useEffect, useRef, useState } from "react";

import { useAuth } from "../../auth/AuthContext.js";
import { criterionLabel, isAbortError, responseError, reviewCriteria, targetLabel, type ModerationReview } from "./moderation.js";

export function ModerationReviewsSection() {
  const { apiFetch } = useAuth();
  const [reviews, setReviews] = useState<ModerationReview[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState<number | null>(null);
  const loadController = useRef<AbortController | null>(null);
  const actionControllers = useRef(new Map<number, AbortController>());

  const load = () => {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setState("loading"); setError("");
    void apiFetch("/api/moderation/reviews?status=pending", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseError(response, "Não foi possível carregar as avaliações pendentes."));
        const data = await response.json() as ModerationReview[];
        if (!controller.signal.aborted) { setReviews(data); setState("ready"); }
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted && !isAbortError(loadError)) { setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as avaliações pendentes."); setState("error"); }
      });
  };

  useEffect(() => {
    load();
    return () => { loadController.current?.abort(); actionControllers.current.forEach((controller) => controller.abort()); };
  // Loading is intentionally once per mounted moderation panel; retry is explicit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (review: ModerationReview, status: "published" | "removed") => {
    if (workingId !== null || actionControllers.current.has(review.id)) return;
    if (status === "removed" && !window.confirm("Remover esta avaliação? Esta ação não pode ser desfeita.")) return;
    const controller = new AbortController(); actionControllers.current.set(review.id, controller); setWorkingId(review.id); setError("");
    try {
      const response = await apiFetch(`/api/moderation/reviews/${review.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }), signal: controller.signal });
      if (!response.ok) throw new Error(await responseError(response, "Não foi possível atualizar a avaliação."));
      if (!controller.signal.aborted) setReviews((items) => items.filter((item) => item.id !== review.id));
    } catch (actionError) {
      if (!controller.signal.aborted && !isAbortError(actionError)) setError(actionError instanceof Error ? actionError.message : "Não foi possível atualizar a avaliação.");
    } finally {
      actionControllers.current.delete(review.id);
      if (!controller.signal.aborted) setWorkingId((id) => id === review.id ? null : id);
    }
  };

  if (state === "loading") return <p className="inline-state">Carregando avaliações pendentes...</p>;
  if (state === "error") return <SectionError message={error} retry={load} />;
  if (reviews.length === 0) return <p className="inline-state">Nenhuma avaliação pendente.</p>;
  return <>
    {error ? <p className="inline-error" role="alert">{error}</p> : null}
    <div className="moderation-list">
      {reviews.map((review) => {
        const working = workingId === review.id;
        return <article className="moderation-card" key={review.id}>
          <div className="moderation-card-heading"><h3>{targetLabel(review)}</h3><strong>Média {Number(review.rating).toFixed(1)}</strong></div>
          <p className="moderation-meta">Por {review.author?.name ?? "Autor removido"} · {new Date(review.createdAt).toLocaleDateString("pt-BR")}</p>
          <dl className="moderation-criteria">{reviewCriteria(review).map(([key, value]) => <div key={key}><dt>{criterionLabel(key)}</dt><dd>{value}</dd></div>)}</dl>
          <p>{review.comment}</p>
          <div className="moderation-actions"><button disabled={working} onClick={() => void updateStatus(review, "published")}>Aprovar</button><button className="danger-button" disabled={working} onClick={() => void updateStatus(review, "removed")}>Remover</button></div>
        </article>;
      })}
    </div>
  </>;
}

export function SectionError({ message, retry }: { message: string; retry: () => void }) {
  return <div className="moderation-error" role="alert"><p>{message}</p><button onClick={retry}>Tentar novamente</button></div>;
}
