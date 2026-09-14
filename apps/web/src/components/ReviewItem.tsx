import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import { useAuth } from "../auth/AuthContext.js";
import {
  reviewApiPath,
  reviewTargetConfig,
  reviewTargetFrom,
  type CriterionKey,
  type Review,
} from "../types/review.js";
import { countReviewCommentCharacters, REVIEW_COMMENT_MAX_LENGTH } from "../reviewComment.js";

type EditFeedback = "validation" | "length" | "success" | "error" | null;
type RatingInputs = Partial<Record<CriterionKey, string>>;

const reviewDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "UTC",
});
const ratingFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function ratingInputsFrom(review: Review): RatingInputs {
  return Object.fromEntries(Object.entries(review.ratings).map(([key, value]) => [key, String(value)]));
}

export function ReviewItem({ review, subject, onDeleted, onUpdated }: {
  review: Review;
  subject?: { label: "Professor" | "Disciplina"; text: string; to: string };
  onDeleted: (reviewId: number) => void;
  onUpdated: (review: Review) => void;
}) {
  const { apiFetch } = useAuth();
  const target = reviewTargetFrom(review);
  const config = reviewTargetConfig[review.targetType];
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteHasError, setDeleteHasError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ratings, setRatings] = useState<RatingInputs>(() => ratingInputsFrom(review));
  const [comment, setComment] = useState(review.comment);
  const [editFeedback, setEditFeedback] = useState<EditFeedback>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  function beginEditing() {
    if (controllerRef.current !== null) return;
    setIsConfirming(false);
    setDeleteHasError(false);
    setRatings(ratingInputsFrom(review));
    setComment(review.comment);
    setEditFeedback(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setRatings(ratingInputsFrom(review));
    setComment(review.comment);
    setEditFeedback(null);
    setIsEditing(false);
  }

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedRatings = Object.fromEntries(config.criteria.map(([key]) => [key, Number(ratings[key])]));
    const hasInvalidRating = config.criteria.some(([key]) => {
      const value = ratings[key];
      const numericValue = Number(value);
      return value === undefined || value === "" || !Number.isInteger(numericValue) || numericValue < 1 || numericValue > 5;
    });
    const commentLength = countReviewCommentCharacters(comment);

    if (hasInvalidRating || comment.trim().length === 0) {
      setEditFeedback("validation");
      return;
    }
    if (commentLength > REVIEW_COMMENT_MAX_LENGTH) {
      setEditFeedback("length");
      return;
    }
    if (controllerRef.current !== null) return;

    const controller = new AbortController();
    controllerRef.current = controller;
    setIsSaving(true);
    setEditFeedback(null);

    try {
      const response = await apiFetch(reviewApiPath(target, review.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratings: parsedRatings, comment }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (response.status !== 200) {
        setEditFeedback("error");
        return;
      }

      const updatedReview = (await response.json()) as Review;
      if (controller.signal.aborted) return;
      onUpdated(updatedReview);
      setRatings(ratingInputsFrom(updatedReview));
      setComment(updatedReview.comment);
      setIsEditing(false);
      setEditFeedback("success");
    } catch {
      if (!controller.signal.aborted) setEditFeedback("error");
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        if (!controller.signal.aborted) setIsSaving(false);
      }
    }
  }

  async function handleDelete() {
    if (controllerRef.current !== null) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsDeleting(true);
    setDeleteHasError(false);

    try {
      const response = await apiFetch(reviewApiPath(target, review.id), {
        method: "DELETE",
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (response.status !== 204) {
        setDeleteHasError(true);
        return;
      }
      onDeleted(review.id);
    } catch {
      if (!controller.signal.aborted) setDeleteHasError(true);
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        if (!controller.signal.aborted) setIsDeleting(false);
      }
    }
  }

  const commentLength = countReviewCommentCharacters(comment);
  const commentCountClassName = commentLength > REVIEW_COMMENT_MAX_LENGTH
    ? "review-character-count review-character-count-exceeded"
    : commentLength >= 450
      ? "review-character-count review-character-count-attention"
      : "review-character-count";
  const ratingValues = review.ratings as unknown as Record<CriterionKey, number>;

  return (
    <li className="review-card">
      {subject !== undefined ? (
        <h2 className="my-review-professor">{subject.label}: <Link to={subject.to}>{subject.text}</Link></h2>
      ) : null}
      {isEditing ? (
        <form className="review-edit-form" noValidate onSubmit={handleUpdate}>
          <div className="review-criteria-inputs">
            {config.criteria.map(([key, label]) => (
              <div className="review-criterion-input" key={key}>
                <label htmlFor={`review-${review.id}-${key}`}>{label}</label>
                <select className="review-input" id={`review-${review.id}-${key}`}
                  value={ratings[key] ?? ""} disabled={isSaving}
                  onChange={(event) => {
                    setRatings((current) => ({ ...current, [key]: event.target.value }));
                    setEditFeedback(null);
                  }}>
                  <option value="">Selecione</option>
                  {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
            ))}
          </div>
          <label htmlFor={`review-comment-${review.id}`}>Comentário</label>
          <textarea className="review-input review-textarea" id={`review-comment-${review.id}`}
            aria-describedby={`review-comment-count-${review.id}`} value={comment} disabled={isSaving}
            onChange={(event) => { setComment(event.target.value); setEditFeedback(null); }} />
          <p className={commentCountClassName} id={`review-comment-count-${review.id}`}>
            {commentLength}/{REVIEW_COMMENT_MAX_LENGTH} caracteres
          </p>
          <div className="review-edit-actions">
            <button className="review-edit-save" type="submit" disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar alterações"}</button>
            <button className="review-edit-cancel" type="button" disabled={isSaving} onClick={cancelEditing}>Cancelar edição</button>
          </div>
        </form>
      ) : (
        <>
          <p className="review-rating">Média geral: {ratingFormatter.format(review.rating)}/5</p>
          <dl className="review-rating-breakdown">
            {config.criteria.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{ratingValues[key]}/5</dd></div>)}
          </dl>
          <p className="review-comment">{review.comment}</p>
          <p className="review-date">Criada em: <time dateTime={review.createdAt}>{reviewDateFormatter.format(new Date(review.createdAt))} UTC</time></p>
          {Date.parse(review.updatedAt) > Date.parse(review.createdAt) ? (
            <p className="review-date">Atualizada em: <time dateTime={review.updatedAt}>{reviewDateFormatter.format(new Date(review.updatedAt))} UTC</time></p>
          ) : null}
        </>
      )}
      {review.canManage && !isEditing && !isConfirming ? (
        <div className="review-actions">
          <button className="review-edit" type="button" onClick={beginEditing}>Editar avaliação</button>
          <button className="review-delete" type="button" onClick={() => { setIsEditing(false); setEditFeedback(null); setDeleteHasError(false); setIsConfirming(true); }}>Excluir avaliação</button>
        </div>
      ) : null}
      {review.canManage && !isEditing && isConfirming ? (
        <div className="review-delete-confirmation">
          <p>Deseja excluir esta avaliação?</p>
          <button className="review-delete-confirm" type="button" disabled={isDeleting} onClick={() => void handleDelete()}>{isDeleting ? "Excluindo..." : "Confirmar exclusão"}</button>
          <button className="review-delete-cancel" type="button" disabled={isDeleting} onClick={() => { setIsConfirming(false); setDeleteHasError(false); }}>Cancelar</button>
        </div>
      ) : null}
      {editFeedback === "validation" ? <p className="form-feedback" role="alert">Selecione notas de 1 a 5 para todos os critérios e escreva um comentário.</p> : null}
      {editFeedback === "length" ? <p className="form-feedback" role="alert">O comentário deve ter no máximo 500 caracteres.</p> : null}
      {editFeedback === "error" ? <p className="form-feedback" role="alert">Não foi possível editar a avaliação.</p> : null}
      {editFeedback === "success" ? <p className="form-feedback" role="status">Avaliação atualizada com sucesso.</p> : null}
      {deleteHasError ? <p className="form-feedback" role="alert">Não foi possível excluir a avaliação.</p> : null}
    </li>
  );
}
