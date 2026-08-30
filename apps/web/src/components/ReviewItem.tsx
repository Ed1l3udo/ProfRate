import { useEffect, useRef, useState } from "react";

import type { Review } from "../types/professor.js";

type EditFeedback = "validation" | "success" | "error" | null;

export function ReviewItem({
  professorId,
  review,
  onDeleted,
  onUpdated,
}: {
  professorId: number;
  review: Review;
  onDeleted: (reviewId: number) => void;
  onUpdated: (review: Review) => void;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteHasError, setDeleteHasError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rating, setRating] = useState(String(review.rating));
  const [comment, setComment] = useState(review.comment);
  const [editFeedback, setEditFeedback] = useState<EditFeedback>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  function beginEditing() {
    if (controllerRef.current !== null) {
      return;
    }

    setIsConfirming(false);
    setDeleteHasError(false);
    setRating(String(review.rating));
    setComment(review.comment);
    setEditFeedback(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setRating(String(review.rating));
    setComment(review.comment);
    setEditFeedback(null);
    setIsEditing(false);
  }

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericRating = Number(rating);
    if (
      rating === "" ||
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5 ||
      comment.trim().length === 0
    ) {
      setEditFeedback("validation");
      return;
    }

    if (controllerRef.current !== null) {
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setIsSaving(true);
    setEditFeedback(null);

    try {
      const response = await fetch(
        `/api/professors/${professorId}/reviews/${review.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: numericRating, comment }),
          signal: controller.signal,
        },
      );

      if (controller.signal.aborted) {
        return;
      }

      if (response.status !== 200) {
        setEditFeedback("error");
        return;
      }

      const updatedReview = (await response.json()) as Review;

      if (controller.signal.aborted) {
        return;
      }

      onUpdated(updatedReview);
      setRating(String(updatedReview.rating));
      setComment(updatedReview.comment);
      setIsEditing(false);
      setEditFeedback("success");
    } catch {
      if (!controller.signal.aborted) {
        setEditFeedback("error");
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;

        if (!controller.signal.aborted) {
          setIsSaving(false);
        }
      }
    }
  }

  async function handleDelete() {
    if (controllerRef.current !== null) {
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setIsDeleting(true);
    setDeleteHasError(false);

    try {
      const response = await fetch(
        `/api/professors/${professorId}/reviews/${review.id}`,
        { method: "DELETE", signal: controller.signal },
      );

      if (controller.signal.aborted) {
        return;
      }

      if (response.status !== 204) {
        setDeleteHasError(true);
        return;
      }

      onDeleted(review.id);
    } catch {
      if (!controller.signal.aborted) {
        setDeleteHasError(true);
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
      {isEditing ? (
        <form className="review-edit-form" noValidate onSubmit={handleUpdate}>
          <label htmlFor={`review-rating-${review.id}`}>Nota</label>
          <input
            className="review-input"
            id={`review-rating-${review.id}`}
            type="number"
            min="1"
            max="5"
            step="1"
            value={rating}
            disabled={isSaving}
            onChange={(event) => {
              setRating(event.target.value);
              setEditFeedback(null);
            }}
          />
          <label htmlFor={`review-comment-${review.id}`}>Comentário</label>
          <textarea
            className="review-input review-textarea"
            id={`review-comment-${review.id}`}
            value={comment}
            disabled={isSaving}
            onChange={(event) => {
              setComment(event.target.value);
              setEditFeedback(null);
            }}
          />
          <div className="review-edit-actions">
            <button
              className="review-edit-save"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar alterações"}
            </button>
            <button
              className="review-edit-cancel"
              type="button"
              disabled={isSaving}
              onClick={cancelEditing}
            >
              Cancelar edição
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="review-rating">Nota: {review.rating}/5</p>
          <p className="review-comment">{review.comment}</p>
        </>
      )}
      {!isEditing && !isConfirming ? (
        <div className="review-actions">
          <button className="review-edit" type="button" onClick={beginEditing}>
            Editar avaliação
          </button>
          <button
            className="review-delete"
            type="button"
            onClick={() => {
              setIsEditing(false);
              setEditFeedback(null);
              setDeleteHasError(false);
              setIsConfirming(true);
            }}
          >
            Excluir avaliação
          </button>
        </div>
      ) : null}
      {!isEditing && isConfirming ? (
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
              setDeleteHasError(false);
            }}
          >
            Cancelar
          </button>
        </div>
      ) : null}
      {editFeedback === "validation" ? (
        <p className="form-feedback" role="alert">
          Preencha uma nota de 1 a 5 e um comentário.
        </p>
      ) : null}
      {editFeedback === "error" ? (
        <p className="form-feedback" role="alert">
          Não foi possível editar a avaliação.
        </p>
      ) : null}
      {editFeedback === "success" ? (
        <p className="form-feedback" role="status">
          Avaliação atualizada com sucesso.
        </p>
      ) : null}
      {deleteHasError ? (
        <p className="form-feedback" role="alert">
          Não foi possível excluir a avaliação.
        </p>
      ) : null}
    </li>
  );
}
