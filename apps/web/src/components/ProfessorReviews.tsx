import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";

import { useAuth } from "../auth/AuthContext.js";
import { type Review, reviewApiPath, type ReviewTarget } from "../types/review.js";
import { ReviewForm } from "./ReviewForm.js";
import { ReviewItem } from "./ReviewItem.js";

type LoadState = "loading" | "success" | "error";
type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";
type ReviewOrder = "newest" | "oldest" | "highest-rating" | "lowest-rating";

function compareCreatedAtNewest(first: Review, second: Review) {
  return Date.parse(second.createdAt) - Date.parse(first.createdAt) || second.id - first.id;
}

export function deriveVisibleReviews(reviews: Review[], ratingFilter: RatingFilter, reviewOrder: ReviewOrder) {
  const filteredReviews = ratingFilter === "all"
    ? reviews
    : reviews.filter((review) => {
        const band = Number(ratingFilter);
        return band === 5 ? review.rating === 5 : review.rating >= band && review.rating < band + 1;
      });

  return [...filteredReviews].sort((first, second) => {
    switch (reviewOrder) {
      case "oldest":
        return Date.parse(first.createdAt) - Date.parse(second.createdAt) || first.id - second.id;
      case "highest-rating":
        return second.rating - first.rating || compareCreatedAtNewest(first, second);
      case "lowest-rating":
        return first.rating - second.rating || compareCreatedAtNewest(first, second);
      case "newest":
        return compareCreatedAtNewest(first, second);
    }
  });
}

export function ReviewsSection({ target }: { target: ReviewTarget }) {
  const { apiFetch, status, user } = useAuth();
  const location = useLocation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [reviewOrder, setReviewOrder] = useState<ReviewOrder>("newest");
  const controlSuffix = `${target.targetType}-${target.targetId}`;

  useEffect(() => {
    const controller = new AbortController();
    setReviews([]);
    setLoadState("loading");
    setRatingFilter("all");
    setReviewOrder("newest");

    apiFetch(reviewApiPath(target), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = (await response.json()) as Review[];
        if (!controller.signal.aborted) {
          setReviews(data);
          setLoadState("success");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadState("error");
      });

    return () => controller.abort();
  }, [apiFetch, target.targetId, target.targetType]);

  const reviewCount = reviews.length;
  const averageRating = reviewCount === 0 ? null : reviews.reduce((total, review) => total + review.rating, 0) / reviewCount;
  const formattedAverage = averageRating === null ? null : new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(averageRating);
  const visibleReviews = deriveVisibleReviews(reviews, ratingFilter, reviewOrder);

  return (
    <section className="review-section" aria-labelledby={`reviews-heading-${controlSuffix}`}>
      <h2 id={`reviews-heading-${controlSuffix}`}>Avaliações</h2>
      {loadState === "loading" ? <p className="state-message">Carregando avaliações...</p> : null}
      {loadState === "error" ? <p className="state-message" role="alert">Não foi possível carregar as avaliações.</p> : null}
      {loadState === "success" ? (
        <div className="review-summary" aria-label="Resumo das avaliações">
          <p className="review-summary-title">Resumo geral</p>
          <p>{reviewCount} {reviewCount === 1 ? "avaliação" : "avaliações"}</p>
          <p>{formattedAverage === null ? "Sem média" : `Média: ${formattedAverage}/5`}</p>
        </div>
      ) : null}
      {loadState === "success" && reviews.length > 0 ? (
        <div className="review-controls">
          <div className="review-control">
            <label htmlFor={`review-rating-filter-${controlSuffix}`}>Filtrar por nota</label>
            <select id={`review-rating-filter-${controlSuffix}`} value={ratingFilter}
              onChange={(event) => setRatingFilter(event.target.value as RatingFilter)}>
              <option value="all">Todas as médias</option>
              <option value="5">Média de 5,0</option>
              <option value="4">Média entre 4,0 e 4,9</option>
              <option value="3">Média entre 3,0 e 3,9</option>
              <option value="2">Média entre 2,0 e 2,9</option>
              <option value="1">Média entre 1,0 e 1,9</option>
            </select>
          </div>
          <div className="review-control">
            <label htmlFor={`review-order-${controlSuffix}`}>Ordenar avaliações</label>
            <select id={`review-order-${controlSuffix}`} value={reviewOrder}
              onChange={(event) => setReviewOrder(event.target.value as ReviewOrder)}>
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
              <option value="highest-rating">Maior nota</option>
              <option value="lowest-rating">Menor nota</option>
            </select>
          </div>
        </div>
      ) : null}
      {loadState === "success" && reviews.length === 0 ? <p className="state-message">Nenhuma avaliação ainda.</p> : null}
      {loadState === "success" && reviews.length > 0 && visibleReviews.length === 0 ? <p className="state-message">Nenhuma avaliação corresponde ao filtro.</p> : null}
      {loadState === "success" && visibleReviews.length > 0 ? (
        <ul className="review-list">
          {visibleReviews.map((review) => <ReviewItem key={review.id} review={review}
            onDeleted={(reviewId) => setReviews((current) => current.filter((item) => item.id !== reviewId))}
            onUpdated={(updated) => {
              setReviews((current) => current.map((item) => item.id === updated.id ? updated : item));
              setRatingFilter("all");
            }} />)}
        </ul>
      ) : null}
      {loadState === "success" && status === "authenticated" && user?.role === "student" && !user.isBlocked ? (
        <ReviewForm target={target} onReviewCreated={(review) => {
          setReviews((current) => [...current, review]);
          setRatingFilter("all");
        }} />
      ) : null}
      {loadState === "success" && status === "authenticated" && user?.isBlocked ? <p className="review-auth-invite">Sua conta está bloqueada para novas alterações.</p> : null}
      {loadState === "success" && status === "anonymous" ? (
        <p className="review-auth-invite"><Link to="/login" state={{ from: `${location.pathname}${location.search}` }}>Entre</Link>{" para publicar uma avaliação."}</p>
      ) : null}
      {loadState === "success" && status === "authenticated" && user?.role === "moderator" ? (
        <p className="review-auth-invite">Contas de moderação não publicam avaliações.</p>
      ) : null}
    </section>
  );
}

export function ProfessorReviews({ professorId }: { professorId: number }) {
  return <ReviewsSection target={{ targetType: "professor", targetId: professorId }} />;
}
