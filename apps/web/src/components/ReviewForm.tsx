import { useEffect, useRef, useState } from "react";

import type { Review } from "../types/professor.js";

type Feedback = "validation" | "success" | "error" | null;

export function ReviewForm({
  professorId,
  onReviewCreated,
}: {
  professorId: number;
  onReviewCreated: (review: Review) => void;
}) {
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericRating = Number(rating);
    if (
      rating === "" ||
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5 ||
      comment.trim().length === 0
    ) {
      setFeedback("validation");
      return;
    }

    if (isSubmitting) {
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/professors/${professorId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: numericRating, comment }),
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        return;
      }

      if (response.status !== 201) {
        setFeedback("error");
        return;
      }

      const data = (await response.json()) as Review;

      if (controller.signal.aborted) {
        return;
      }

      onReviewCreated(data);
      setRating("");
      setComment("");
      setFeedback("success");
    } catch {
      if (!controller.signal.aborted) {
        setFeedback("error");
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsSubmitting(false);
        controllerRef.current = null;
      }
    }
  }

  return (
    <form className="review-form" noValidate onSubmit={handleSubmit}>
      <h3>Nova avaliação</h3>
      <label htmlFor="review-rating">Nota</label>
      <input
        id="review-rating"
        type="number"
        min="1"
        max="5"
        step="1"
        value={rating}
        onChange={(event) => {
          setRating(event.target.value);
          setFeedback(null);
        }}
      />
      <label htmlFor="review-comment">Comentário</label>
      <textarea
        id="review-comment"
        value={comment}
        onChange={(event) => {
          setComment(event.target.value);
          setFeedback(null);
        }}
      />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enviando..." : "Enviar avaliação"}
      </button>
      {feedback === "validation" ? (
        <p role="alert">Preencha uma nota de 1 a 5 e um comentário.</p>
      ) : null}
      {feedback === "success" ? (
        <p role="status">Avaliação enviada com sucesso.</p>
      ) : null}
      {feedback === "error" ? (
        <p role="alert">Não foi possível enviar a avaliação.</p>
      ) : null}
    </form>
  );
}
