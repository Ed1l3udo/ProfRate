import { useEffect, useState } from "react";

import { useAuth } from "../auth/AuthContext.js";
import { ReviewItem } from "../components/ReviewItem.js";
import type { MyReview } from "../types/professor.js";

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

  function handleUpdated(updated: MyReview) {
    setReviews((current) => current.map((review) =>
      review.id === updated.id ? { ...review, ...updated } : review,
    ));
  }

  return (
    <main className="page-shell">
      <h1>Minhas avaliações</h1>
      {loadState === "loading" ? <p className="inline-state">Carregando suas avaliações...</p> : null}
      {loadState === "error" ? <p className="inline-state" role="alert">Não foi possível carregar suas avaliações.</p> : null}
      {loadState === "success" && reviews.length === 0 ? <p className="inline-state">Você ainda não publicou avaliações.</p> : null}
      {loadState === "success" && reviews.length > 0 ? (
        <ul className="review-list my-review-list">
          {reviews.map((review) => (
            <ReviewItem
              key={review.id}
              professorId={review.professorId}
              professor={review.professor}
              review={review}
              onDeleted={(id) => setReviews((current) => current.filter((item) => item.id !== id))}
              onUpdated={(updated) => handleUpdated({ ...review, ...updated })}
            />
          ))}
        </ul>
      ) : null}
    </main>
  );
}
