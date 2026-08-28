import { useEffect, useRef, useState } from "react";

import type { Review } from "../types/professor.js";

export function ReviewItem({
  professorId,
  review,
  onDeleted,
}: {
  professorId: number;
  review: Review;
  onDeleted: (reviewId: number) => void;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  async function handleDelete() {
    if (controllerRef.current !== null) {
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setIsDeleting(true);
    setHasError(false);

    try {
      const response = await fetch(
        `/api/professors/${professorId}/reviews/${review.id}`,
        { method: "DELETE", signal: controller.signal },
      );

      if (controller.signal.aborted) {
        return;
      }

      if (response.status !== 204) {
        setHasError(true);
        return;
      }

      onDeleted(review.id);
    } catch {
      if (!controller.signal.aborted) {
        setHasError(true);
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;

        if (!controller.signal.aborted) {
          setIsDeleting(false);
        }
      }
    }
  }

  return (
    <li className="review-card">
      <p className="review-rating">Nota: {review.rating}/5</p>
      <p className="review-comment">{review.comment}</p>
      {!isConfirming ? (
        <button
          className="review-delete"
          type="button"
          onClick={() => {
            setHasError(false);
            setIsConfirming(true);
          }}
        >
          Excluir avaliação
        </button>
      ) : (
        <div className="review-delete-confirmation">
          <p>Deseja excluir esta avaliação?</p>
          <button
            className="review-delete-confirm"
            type="button"
            disabled={isDeleting}
            onClick={() => void handleDelete()}
          >
            {isDeleting ? "Excluindo..." : "Confirmar exclusão"}
          </button>
          <button
            className="review-delete-cancel"
            type="button"
            disabled={isDeleting}
            onClick={() => {
              setIsConfirming(false);
              setHasError(false);
            }}
          >
            Cancelar
          </button>
        </div>
      )}
      {hasError ? (
        <p className="form-feedback" role="alert">
          Não foi possível excluir a avaliação.
        </p>
      ) : null}
    </li>
  );
}
