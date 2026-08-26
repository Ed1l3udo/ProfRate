export type ProfessorSummary = {
  id: number;
  name: string;
  department: string;
};

export type ProfessorDetails = ProfessorSummary & {
  department: string;
};

export type Review = {
  id: number;
  professorId: number;
  rating: number;
  comment: string;
};
