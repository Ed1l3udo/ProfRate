import { useEffect, useRef, useState } from "react";

import { useAuth } from "../auth/AuthContext.js";
import {
  reviewApiPath,
  reviewTargetConfig,
  type CriterionKey,
  type Review,
  type ReviewTarget,
} from "../types/review.js";
import { countReviewCommentCharacters, REVIEW_COMMENT_MAX_LENGTH } from "../reviewComment.js";

type Feedback = "validation" | "length" | "success" | "error" | null;
type RatingInputs = Partial<Record<CriterionKey, string>>;

export function ReviewForm({ target, onReviewCreated }: {
  target: ReviewTarget;
  onReviewCreated: (review: Review) => void;
}) {
  const { apiFetch } = useAuth();
  const config = reviewTargetConfig[target.targetType];
  const [ratings, setRatings] = useState<RatingInputs>({});
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedRatings = Object.fromEntries(config.criteria.map(([key]) => [key, Number(ratings[key])]));
    const hasInvalidRating = config.criteria.some(([key]) => {
      const value = ratings[key];
      const numericValue = Number(value);
      return value === undefined || value === "" || !Number.isInteger(numericValue) || numericValue < 1 || numericValue > 5;
    });
    const commentLength = countReviewCommentCharacters(comment);

    if (hasInvalidRating || comment.trim().length === 0) {
      setFeedback("validation");
      return;
    }
    if (commentLength > REVIEW_COMMENT_MAX_LENGTH) {
      setFeedback("length");
      return;
    }
    if (isSubmitting) return;

    const controller = new AbortController();
    controllerRef.current = controller;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await apiFetch(reviewApiPath(target), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratings: parsedRatings, comment }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (response.status !== 201) {
        setFeedback("error");
        return;
      }

      const data = (await response.json()) as Review;
      if (controller.signal.aborted) return;
      onReviewCreated(data);
      setRatings({});
      setComment("");
      setFeedback("success");
    } catch {
      if (!controller.signal.aborted) setFeedback("error");
    } finally {
      if (!controller.signal.aborted) {
        setIsSubmitting(false);
        controllerRef.current = null;
      }
    }
  }

  const commentLength = countReviewCommentCharacters(comment);
  const commentCountClassName = commentLength > REVIEW_COMMENT_MAX_LENGTH
    ? "review-character-count review-character-count-exceeded"
    : commentLength >= 450
      ? "review-character-count review-character-count-attention"
      : "review-character-count";
  const commentId = target.targetType === "professor" ? "review-comment" : "review-comment-discipline";
  const commentCountId = target.targetType === "professor" ? "review-comment-count" : "review-comment-count-discipline";

  return (
    <form className="review-form" noValidate onSubmit={handleSubmit}>
      <h3>Nova avaliação</h3>
      <div className="review-criteria-inputs">
        {config.criteria.map(([key, label]) => (
          <div className="review-criterion-input" key={key}>
            <label htmlFor={`review-${target.targetType}-${key}`}>{label}</label>
            <select
              className="review-input"
              id={`review-${target.targetType}-${key}`}
              value={ratings[key] ?? ""}
              disabled={isSubmitting}
              onChange={(event) => {
                setRatings((current) => ({ ...current, [key]: event.target.value }));
                setFeedback(null);
              }}
            >
              <option value="">Selecione</option>
              {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
        ))}
      </div>
      <label htmlFor={commentId}>Comentário</label>
      <textarea
        className="review-input review-textarea"
        id={commentId}
        aria-describedby={commentCountId}
        value={comment}
        disabled={isSubmitting}
        onChange={(event) => {
          setComment(event.target.value);
          setFeedback(null);
        }}
      />
      <p className={commentCountClassName} id={commentCountId}>
        {commentLength}/{REVIEW_COMMENT_MAX_LENGTH} caracteres
      </p>
      <button className="review-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enviando..." : "Enviar avaliação"}
      </button>
      {feedback === "validation" ? <p className="form-feedback" role="alert">Selecione notas de 1 a 5 para todos os critérios e escreva um comentário.</p> : null}
      {feedback === "length" ? <p className="form-feedback" role="alert">O comentário deve ter no máximo 500 caracteres.</p> : null}
      {feedback === "success" ? <p className="form-feedback" role="status">Avaliação enviada com sucesso.</p> : null}
      {feedback === "error" ? <p className="form-feedback" role="alert">Não foi possível enviar a avaliação.</p> : null}
    </form>
  );
}
