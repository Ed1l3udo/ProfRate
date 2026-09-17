import { useEffect, useState } from "react";

import { useAuth } from "../auth/AuthContext.js";
import { ReviewItem } from "../components/ReviewItem.js";
import { EmptyState, ErrorState, LoadingState } from "../components/States.js";
import type { MyReview, Review } from "../types/review.js";

type LoadState = "loading" | "success" | "error";

export function MyReviewsPage() {
  const { apiFetch } = useAuth();
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/api/me/reviews", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = (await response.json()) as MyReview[];
        if (!controller.signal.aborted) {
          setReviews(data);
          setLoadState("success");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadState("error");
      });
    return () => controller.abort();
  }, [apiFetch]);

  function handleUpdated(updated: Review) {
    setReviews((current) => current.map((review) =>
      review.id === updated.id && review.targetType === updated.targetType
        ? ({ ...review, ...updated } as MyReview)
        : review,
    ));
  }

  return (
    <main className="page-shell">
      <header className="page-header"><p className="eyebrow">Sua participação</p><h1>Minhas avaliações</h1><p className="page-intro">Acompanhe o status e atualize as avaliações que você escreveu.</p></header>
      {loadState === "loading" ? <LoadingState>Carregando suas avaliações...</LoadingState> : null}
      {loadState === "error" ? <ErrorState>Não foi possível carregar suas avaliações.</ErrorState> : null}
      {loadState === "success" && reviews.length === 0 ? <EmptyState title="Você ainda não publicou avaliações." action={{ to: "/", label: "Explorar professores" }}>Quando você publicar uma avaliação, ela aparecerá aqui.</EmptyState> : null}
      {loadState === "success" && reviews.length > 0 ? (
        <ul className="review-list my-review-list">
          {reviews.map((review) => (
            <ReviewItem
              key={review.id}
              review={review}
              subject={review.targetType === "professor"
                ? { label: "Professor", text: review.professor.name, to: `/professors/${review.professorId}` }
                : { label: "Disciplina", text: `${review.discipline.code} — ${review.discipline.name}`, to: `/disciplines/${review.disciplineId}` }}
              onDeleted={(id) => setReviews((current) => current.filter((item) => item.id !== id))}
              onUpdated={handleUpdated}
            />
          ))}
        </ul>
      ) : null}
    </main>
  );
}
