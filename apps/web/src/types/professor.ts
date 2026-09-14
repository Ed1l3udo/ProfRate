export type ProfessorListItem = {
  id: number;
  name: string;
  department: string;
  reviewCount: number;
  averageRating: number | null;
};

export type ProfessorDetails = {
  id: number;
  name: string;
  department: string;
};

export type { MyReview, ProfessorReview as Review } from "./review.js";
