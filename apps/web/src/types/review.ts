export type ProfessorRatings = {
  didactics: number;
  clarity: number;
  punctuality: number;
  availability: number;
};

export type DisciplineRatings = {
  difficulty: number;
  relevance: number;
  workload: number;
};

type ReviewBase = {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  canManage: boolean;
  helpfulCount?: number;
  viewerHasMarkedHelpful?: boolean;
  canMarkHelpful?: boolean;
  status?: "pending" | "published" | "removed";
};

export type ProfessorReview = ReviewBase & {
  targetType: "professor";
  professorId: number;
  disciplineId: null;
  ratings: ProfessorRatings;
};

export type DisciplineReview = ReviewBase & {
  targetType: "discipline";
  professorId: null;
  disciplineId: number;
  ratings: DisciplineRatings;
};

export type Review = ProfessorReview | DisciplineReview;

export type MyReview =
  | (ProfessorReview & { professor: { id: number; name: string } })
  | (DisciplineReview & { discipline: { id: number; code: string; name: string } });

export type ReviewTarget =
  | { targetType: "professor"; targetId: number }
  | { targetType: "discipline"; targetId: number };

export type CriterionKey = keyof ProfessorRatings | keyof DisciplineRatings;

export const reviewTargetConfig = {
  professor: {
    path: "professors",
    criteria: [
      ["didactics", "Didática"],
      ["clarity", "Clareza"],
      ["punctuality", "Pontualidade"],
      ["availability", "Disponibilidade"],
    ],
  },
  discipline: {
    path: "disciplines",
    criteria: [
      ["difficulty", "Dificuldade"],
      ["relevance", "Relevância"],
      ["workload", "Carga de trabalho"],
    ],
  },
} as const;

export function reviewTargetFrom(review: Review): ReviewTarget {
  return review.targetType === "professor"
    ? { targetType: "professor", targetId: review.professorId }
    : { targetType: "discipline", targetId: review.disciplineId };
}

export function reviewApiPath(target: ReviewTarget, reviewId?: number) {
  const base = `/api/${reviewTargetConfig[target.targetType].path}/${target.targetId}/reviews`;
  return reviewId === undefined ? base : `${base}/${reviewId}`;
}
