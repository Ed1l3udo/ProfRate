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
  department: Department;
  courses: Array<Pick<Course, "id" | "name">>;
};

export type DisciplineDetails = DisciplineListItem & {
  professors: Array<{ id: number; name: string }>;
};
