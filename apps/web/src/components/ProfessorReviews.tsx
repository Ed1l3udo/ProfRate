import { useEffect, useState } from "react";

import { ReviewForm } from "./ReviewForm.js";
import { ReviewItem } from "./ReviewItem.js";
import type { Review } from "../types/professor.js";

type LoadState = "loading" | "success" | "error";
type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";
type ReviewOrder =
  | "newest"
  | "oldest"
  | "highest-rating"
  | "lowest-rating";

function compareCreatedAtNewest(first: Review, second: Review) {
  return (
    Date.parse(second.createdAt) - Date.parse(first.createdAt) ||
    second.id - first.id
  );
}

function deriveVisibleReviews(
  reviews: Review[],
  ratingFilter: RatingFilter,
  reviewOrder: ReviewOrder,
) {
  const filteredReviews =
    ratingFilter === "all"
      ? reviews
      : reviews.filter((review) => review.rating === Number(ratingFilter));
  const visibleReviews = [...filteredReviews];

  return visibleReviews.sort((first, second) => {
    switch (reviewOrder) {
      case "oldest":
        return (
          Date.parse(first.createdAt) - Date.parse(second.createdAt) ||
          first.id - second.id
        );
      case "highest-rating":
        return second.rating - first.rating || compareCreatedAtNewest(first, second);
      case "lowest-rating":
        return first.rating - second.rating || compareCreatedAtNewest(first, second);
      case "newest":
        return compareCreatedAtNewest(first, second);
    }
  });
}

export function ProfessorReviews({ professorId }: { professorId: number }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [reviewOrder, setReviewOrder] = useState<ReviewOrder>("newest");

  useEffect(() => {
    const controller = new AbortController();

    setReviews([]);
    setLoadState("loading");
    setRatingFilter("all");
    setReviewOrder("newest");

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
    setRatingFilter("all");
  }

  function handleReviewDeleted(reviewId: number) {
    setReviews((currentReviews) =>
      currentReviews.filter((review) => review.id !== reviewId),
    );
  }

  function handleReviewUpdated(updatedReview: Review) {
    setReviews((currentReviews) =>
      currentReviews.map((review) =>
        review.id === updatedReview.id ? updatedReview : review,
      ),
    );
    setRatingFilter("all");
  }

  const reviewCount = reviews.length;
  const averageRating =
    reviewCount === 0
      ? null
      : reviews.reduce((total, review) => total + review.rating, 0) / reviewCount;
  const formattedAverage =
    averageRating === null
      ? null
      : new Intl.NumberFormat("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }).format(averageRating);
  const reviewCountLabel = `${reviewCount} ${reviewCount === 1 ? "avaliação" : "avaliações"}`;
  const visibleReviews = deriveVisibleReviews(reviews, ratingFilter, reviewOrder);

  return (
    <section className="review-section" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading">Avaliações</h2>
      {loadState === "loading" ? <p className="state-message">Carregando avaliações...</p> : null}
      {loadState === "error" ? (
        <p className="state-message" role="alert">Não foi possível carregar as avaliações.</p>
      ) : null}
      {loadState === "success" ? (
        <div className="review-summary" aria-label="Resumo das avaliações">
          <p className="review-summary-title">Resumo geral</p>
          <p>{reviewCountLabel}</p>
          <p>{formattedAverage === null ? "Sem média" : `Média: ${formattedAverage}/5`}</p>
        </div>
      ) : null}
      {loadState === "success" && reviews.length > 0 ? (
        <div className="review-controls">
          <div className="review-control">
            <label htmlFor={`review-rating-filter-${professorId}`}>Filtrar por nota</label>
            <select
              id={`review-rating-filter-${professorId}`}
              value={ratingFilter}
              onChange={(event) => setRatingFilter(event.target.value as RatingFilter)}
            >
              <option value="all">Todas as notas</option>
              <option value="5">Nota 5</option>
              <option value="4">Nota 4</option>
              <option value="3">Nota 3</option>
              <option value="2">Nota 2</option>
              <option value="1">Nota 1</option>
            </select>
          </div>
          <div className="review-control">
            <label htmlFor={`review-order-${professorId}`}>Ordenar avaliações</label>
            <select
              id={`review-order-${professorId}`}
              value={reviewOrder}
              onChange={(event) => setReviewOrder(event.target.value as ReviewOrder)}
            >
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
              <option value="highest-rating">Maior nota</option>
              <option value="lowest-rating">Menor nota</option>
            </select>
          </div>
        </div>
      ) : null}
      {loadState === "success" && reviews.length === 0 ? (
        <p className="state-message">Nenhuma avaliação ainda.</p>
      ) : null}
      {loadState === "success" && reviews.length > 0 && visibleReviews.length === 0 ? (
        <p className="state-message">Nenhuma avaliação corresponde ao filtro.</p>
      ) : null}
      {loadState === "success" && visibleReviews.length > 0 ? (
        <ul className="review-list">
          {visibleReviews.map((review) => (
            <ReviewItem
              key={review.id}
              professorId={professorId}
              review={review}
              onDeleted={handleReviewDeleted}
              onUpdated={handleReviewUpdated}
            />
          ))}
        </ul>
      ) : null}
      {loadState === "success" ? (
        <ReviewForm professorId={professorId} onReviewCreated={handleReviewCreated} />
      ) : null}
    </section>
  );
}
