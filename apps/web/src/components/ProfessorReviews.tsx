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
    <section aria-labelledby="reviews-heading">
      <h2 id="reviews-heading">Avaliações</h2>
      {loadState === "loading" ? <p>Carregando avaliações...</p> : null}
      {loadState === "error" ? (
        <p role="alert">Não foi possível carregar as avaliações.</p>
      ) : null}
      {loadState === "success" && reviews.length === 0 ? (
        <p>Nenhuma avaliação ainda.</p>
      ) : null}
      {loadState === "success" && reviews.length > 0 ? (
        <ul>
          {reviews.map((review) => (
            <li key={review.id}>
              <p>Nota: {review.rating}/5</p>
              <p>{review.comment}</p>
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
