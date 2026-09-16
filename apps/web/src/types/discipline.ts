export type Department = { id: number; name: string };

export type Course = {
  id: number;
  name: string;
  departmentId: number;
  department: string;
};

export type DisciplineListItem = {
  id: number;
  code: string;
  name: string;
  workloadHours: number;
  reviewCount: number;
  averageRating: number | null;
  department: Department;
  courses: Array<Pick<Course, "id" | "name">>;
};

export type DisciplineDetails = DisciplineListItem & {
  isFavorite?: boolean;
  professors: Array<{ id: number; name: string }>;
};
