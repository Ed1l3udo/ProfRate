export type ModerationReview = {
  id: number;
  status: "pending" | "published" | "removed";
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt?: string;
  author: { id: number; name: string; email: string } | null;
  professor: { id: number; name: string } | null;
  discipline: { id: number; code: string; name: string } | null;
  ratings?: Record<string, number>;
  didactics?: number | null;
  clarity?: number | null;
  punctuality?: number | null;
  availability?: number | null;
  difficulty?: number | null;
  relevance?: number | null;
  workload?: number | null;
};

export type ModerationReport = {
  id: number;
  reviewId: number;
  reason: string;
  status: "pending" | "resolved" | "dismissed";
  createdAt: string;
  reporter: { id: number; name: string; email: string };
  review?: ModerationReview | null;
  professor?: { id: number; name: string } | null;
  discipline?: { id: number; code: string; name: string } | null;
};

export type ModerationUser = {
  id: number;
  name: string;
  email: string;
  role: "student" | "moderator";
  blocked: boolean;
  active?: boolean;
  course?: { id: number; name: string } | null;
};

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export async function responseError(response: Response, fallback: string) {
  try {
    const payload = await response.json() as { error?: { message?: string } };
    return payload.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export function targetLabel(review: Pick<ModerationReview, "professor" | "discipline">) {
  if (review.professor) return `Professor: ${review.professor.name}`;
  if (review.discipline) return `Disciplina: ${review.discipline.code} — ${review.discipline.name}`;
  return "Alvo indisponível";
}

const criterionLabels: Record<string, string> = {
  didactics: "Didática",
  clarity: "Clareza",
  punctuality: "Pontualidade",
  availability: "Disponibilidade",
  difficulty: "Dificuldade",
  relevance: "Relevância",
  workload: "Carga de trabalho",
};

export function reviewCriteria(review: ModerationReview) {
  if (review.ratings) return Object.entries(review.ratings);
  return Object.entries(criterionLabels)
    .map(([key, label]) => [label, review[key as keyof ModerationReview]] as const)
    .filter((entry): entry is readonly [string, number] => typeof entry[1] === "number");
}

export function criterionLabel(key: string) {
  return criterionLabels[key] ?? key;
}
