export type ProfessorFilters = {
  search: string;
  department: string;
  page?: string;
};

function readSingleFilter(
  searchParams: URLSearchParams,
  name: keyof ProfessorFilters,
): string {
  const values = searchParams.getAll(name);

  return values.length === 1 ? values[0].trim() : "";
}

export function readProfessorFilters(
  searchParams: URLSearchParams,
): ProfessorFilters {
  return {
    search: readSingleFilter(searchParams, "search"),
    department: readSingleFilter(searchParams, "department"),
    page: readSingleFilter(searchParams, "page"),
  };
}

export function createProfessorSearchParams(
  filters: ProfessorFilters,
): URLSearchParams {
  const searchParams = new URLSearchParams();
  const search = filters.search.trim();
  const department = filters.department.trim();

  if (search !== "") {
    searchParams.set("search", search);
  }

  if (department !== "") {
    searchParams.set("department", department);
  }
  if (filters.page && /^[1-9]\d*$/.test(filters.page) && filters.page !== "1") searchParams.set("page", filters.page);

  return searchParams;
}
