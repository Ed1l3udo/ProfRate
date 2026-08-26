import { useEffect, useState } from "react";

import { ReviewForm } from "./ReviewForm.js";
import type { Review } from "../types/professor.js";

type LoadState = "loading" | "success" | "error";

export function ProfessorReviews({ professorId }: { professorId: number }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    const controller = new AbortController();

    setReviews([]);
    setLoadState("loading");

    async function loadReviews() {
      try {
        const response = await fetch(`/api/professors/${professorId}/reviews`, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        if (!response.ok) {
          setLoadState("error");
          return;
        }

        const data = (await response.json()) as Review[];

        if (controller.signal.aborted) {
          return;
        }

        setReviews(data);
        setLoadState("success");
      } catch {
        if (!controller.signal.aborted) {
          setLoadState("error");
        }
      }
    }

    void loadReviews();

    return () => {
      controller.abort();
    };
  }, [professorId]);

  function handleReviewCreated(review: Review) {
    setReviews((currentReviews) => [...currentReviews, review]);
  }

  return (
    <section className="review-section" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading">Avaliações</h2>
      {loadState === "loading" ? <p className="state-message">Carregando avaliações...</p> : null}
      {loadState === "error" ? (
        <p className="state-message" role="alert">Não foi possível carregar as avaliações.</p>
      ) : null}
      {loadState === "success" && reviews.length === 0 ? (
        <p className="state-message">Nenhuma avaliação ainda.</p>
      ) : null}
      {loadState === "success" && reviews.length > 0 ? (
        <ul className="review-list">
          {reviews.map((review) => (
            <li className="review-card" key={review.id}>
              <p className="review-rating">Nota: {review.rating}/5</p>
              <p className="review-comment">{review.comment}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {loadState === "success" ? (
        <ReviewForm professorId={professorId} onReviewCreated={handleReviewCreated} />
      ) : null}
    </section>
  );
}
