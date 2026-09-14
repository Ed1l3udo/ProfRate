import { useEffect, useRef, useState } from "react";

import { useAuth } from "../auth/AuthContext.js";
import { countReviewCommentCharacters, REVIEW_COMMENT_MAX_LENGTH } from "../reviewComment.js";
import type { Review } from "../types/review.js";

type ReportFeedback = "validation" | "length" | "bad-request" | "unauthorized" | "forbidden" | "not-found" | "duplicate" | "error" | "success" | null;

function reportFeedbackMessage(feedback: Exclude<ReportFeedback, null | "success">) {
  switch (feedback) {
    case "validation": return "Escreva o motivo da denúncia.";
    case "length": return "O motivo deve ter no máximo 500 caracteres.";
    case "bad-request": return "Não foi possível validar o motivo da denúncia.";
    case "unauthorized": return "Sua sessão expirou. Entre novamente para denunciar.";
    case "forbidden": return "Sua conta não pode denunciar esta avaliação.";
    case "not-found": return "Esta avaliação não está mais disponível para denúncia.";
    case "duplicate": return "Você já denunciou esta avaliação.";
    case "error": return "Não foi possível enviar a denúncia. Tente novamente.";
  }
}

/** Inline report flow for a published review that does not belong to the signed-in student. */
export function ReportReview({ review }: { review: Review }) {
  const { apiFetch, status, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<ReportFeedback>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  if (status !== "authenticated" || user?.role !== "student" || user.isBlocked || review.status !== "published" || review.canManage) {
    return null;
  }

  function closeForm() {
    if (controllerRef.current !== null) return;
    setIsOpen(false);
    setIsConfirming(false);
    setFeedback(null);
  }

  function handleStart(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedReason = reason.trim();
    const characterCount = countReviewCommentCharacters(reason);

    if (normalizedReason.length === 0) {
      setFeedback("validation");
      return;
    }
    if (characterCount > REVIEW_COMMENT_MAX_LENGTH) {
      setFeedback("length");
      return;
    }

    setFeedback(null);
    setIsConfirming(true);
  }

  async function submitReport() {
    if (controllerRef.current !== null) return;

    const controller = new AbortController();
    controllerRef.current = controller;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await apiFetch(`/api/reviews/${review.id}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      if (response.status === 201) {
        setIsOpen(false);
        setIsConfirming(false);
        setFeedback("success");
        return;
      }

      setIsConfirming(false);
      setFeedback(
        response.status === 400 ? "bad-request"
          : response.status === 401 ? "unauthorized"
            : response.status === 403 ? "forbidden"
              : response.status === 404 ? "not-found"
                : response.status === 409 ? "duplicate"
                  : "error",
      );
    } catch {
      if (!controller.signal.aborted) {
        setIsConfirming(false);
        setFeedback("error");
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        if (!controller.signal.aborted) setIsSubmitting(false);
      }
    }
  }

  const characterCount = countReviewCommentCharacters(reason);
  const characterCountClassName = characterCount > REVIEW_COMMENT_MAX_LENGTH
    ? "review-character-count review-character-count-exceeded"
    : characterCount >= 450
      ? "review-character-count review-character-count-attention"
      : "review-character-count";
  const inputId = `report-review-${review.id}`;
  const countId = `${inputId}-count`;

  if (feedback === "success") {
    return <p className="form-feedback" role="status">Denúncia enviada para a moderação.</p>;
  }

  return (
    <div className="review-report">
      {!isOpen ? (
        <button className="review-report-open" type="button" onClick={() => setIsOpen(true)}>Denunciar avaliação</button>
      ) : isConfirming ? (
        <div className="review-report-confirmation">
          <p>Enviar esta denúncia para a moderação?</p>
          <button className="review-report-submit" type="button" disabled={isSubmitting} onClick={() => void submitReport()}>
            {isSubmitting ? "Enviando..." : "Confirmar denúncia"}
          </button>
          <button className="review-report-cancel" type="button" disabled={isSubmitting} onClick={closeForm}>Cancelar</button>
        </div>
      ) : (
        <form className="review-report-form" noValidate onSubmit={handleStart}>
          <label htmlFor={inputId}>Motivo da denúncia</label>
          <textarea
            className="review-input review-textarea"
            id={inputId}
            aria-describedby={countId}
            value={reason}
            disabled={isSubmitting}
            onChange={(event) => {
              setReason(event.target.value);
              setFeedback(null);
            }}
          />
          <p className={characterCountClassName} id={countId}>{characterCount}/{REVIEW_COMMENT_MAX_LENGTH} caracteres</p>
          <div className="review-report-actions">
            <button className="review-report-submit" type="submit" disabled={isSubmitting}>Continuar</button>
            <button className="review-report-cancel" type="button" disabled={isSubmitting} onClick={closeForm}>Cancelar</button>
          </div>
        </form>
      )}
      {feedback !== null ? <p className="form-feedback" role="alert">{reportFeedbackMessage(feedback)}</p> : null}
    </div>
  );
}
