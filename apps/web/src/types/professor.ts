export type ProfessorSummary = {
  id: number;
  name: string;
};

export type ProfessorDetails = ProfessorSummary & {
  department: string;
};
