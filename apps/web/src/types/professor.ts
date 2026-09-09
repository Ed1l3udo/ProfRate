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

export type Review = {
  id: number;
  professorId: number;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
};
