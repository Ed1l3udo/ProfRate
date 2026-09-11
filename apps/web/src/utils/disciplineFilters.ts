export type DisciplineFilters = {
  search: string;
  departmentId: string;
  courseId: string;
};

function readSingleFilter(searchParams: URLSearchParams, name: keyof DisciplineFilters) {
  const values = searchParams.getAll(name);

  return values.length === 1 ? values[0].trim() : "";
}

function positiveIntegerOrEmpty(value: string) {
  if (!/^[1-9]\d*$/.test(value)) {
    return "";
  }

  const numericValue = Number(value);
  return numericValue <= 2_147_483_647 ? value : "";
}

export function readDisciplineFilters(searchParams: URLSearchParams): DisciplineFilters {
  return {
    search: readSingleFilter(searchParams, "search"),
    departmentId: positiveIntegerOrEmpty(readSingleFilter(searchParams, "departmentId")),
    courseId: positiveIntegerOrEmpty(readSingleFilter(searchParams, "courseId")),
  };
}

export function createDisciplineSearchParams(filters: DisciplineFilters) {
  const searchParams = new URLSearchParams();
  const search = filters.search.trim();
  const departmentId = positiveIntegerOrEmpty(filters.departmentId.trim());
  const courseId = positiveIntegerOrEmpty(filters.courseId.trim());

  if (search !== "") searchParams.set("search", search);
  if (departmentId !== "") searchParams.set("departmentId", departmentId);
  if (courseId !== "") searchParams.set("courseId", courseId);

  return searchParams;
}
