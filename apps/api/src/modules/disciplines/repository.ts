import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";

import type { Database } from "../../db/database.js";
import {
  courseDisciplines,
  courses,
  departments,
  disciplines,
  favoriteDisciplines,
  professorDisciplines,
  professors,
  reviews,
} from "../../db/schema.js";
import type { DisciplineFilters } from "./schemas.js";

type DisciplineBase = {
  id: number;
  code: string;
  name: string;
  workloadHours: number;
  reviewCount: number;
  averageRating: number | null;
  department: { id: number; name: string };
};

type RelatedCourse = { id: number; name: string };

function groupCourses(
  rows: Array<{ disciplineId: number; id: number; name: string }>,
) {
  const grouped = new Map<number, RelatedCourse[]>();

  for (const row of rows) {
    const related = grouped.get(row.disciplineId) ?? [];
    related.push({ id: row.id, name: row.name });
    grouped.set(row.disciplineId, related);
  }

  return grouped;
}

export function createDisciplinesRepository(db: Database) {
  async function listDisciplines(filters: DisciplineFilters = {}) {
    const rows = await db
      .select({
        id: disciplines.id,
        code: disciplines.code,
        name: disciplines.name,
        workloadHours: disciplines.workloadHours,
        departmentId: departments.id,
        departmentName: departments.name,
        reviewCount: count(reviews.id),
        averageRating: sql<number | null>`avg(${reviews.rating})::double precision`,
      })
      .from(disciplines)
      .innerJoin(departments, eq(departments.id, disciplines.departmentId))
      .leftJoin(reviews, and(eq(reviews.disciplineId, disciplines.id), eq(reviews.status, "published")))
      .where(
        and(
          filters.search === undefined
            ? undefined
            : or(
                ilike(disciplines.name, `%${filters.search}%`),
                ilike(disciplines.code, `%${filters.search}%`),
              ),
          filters.departmentId === undefined
            ? undefined
            : eq(disciplines.departmentId, filters.departmentId),
          filters.courseId === undefined
            ? undefined
            : sql`exists (
                select 1 from ${courseDisciplines}
                where ${courseDisciplines.disciplineId} = ${disciplines.id}
                  and ${courseDisciplines.courseId} = ${filters.courseId}
              )`,
        ),
      )
      .groupBy(
        disciplines.id,
        disciplines.code,
        disciplines.name,
        disciplines.workloadHours,
        departments.id,
        departments.name,
      )
      .orderBy(asc(disciplines.id));

    if (rows.length === 0) {
      return [];
    }

    const courseRows = await db
      .select({
        disciplineId: courseDisciplines.disciplineId,
        id: courses.id,
        name: courses.name,
      })
      .from(courseDisciplines)
      .innerJoin(courses, eq(courses.id, courseDisciplines.courseId))
      .where(inArray(courseDisciplines.disciplineId, rows.map(({ id }) => id)))
      .orderBy(asc(courseDisciplines.disciplineId), asc(courses.id));
    const coursesByDiscipline = groupCourses(courseRows);

    return rows.map(({ departmentId, departmentName, ...discipline }) => ({
      ...discipline,
      department: { id: departmentId, name: departmentName },
      courses: coursesByDiscipline.get(discipline.id) ?? [],
    }));
  }

  async function findDisciplineById(id: number, viewerUserId?: number) {
    const rows = await db
      .select({
        id: disciplines.id,
        code: disciplines.code,
        name: disciplines.name,
        workloadHours: disciplines.workloadHours,
        departmentId: departments.id,
        departmentName: departments.name,
        isFavorite: viewerUserId === undefined ? sql<boolean>`false` : sql<boolean>`exists (select 1 from ${favoriteDisciplines} where ${favoriteDisciplines.disciplineId} = ${disciplines.id} and ${favoriteDisciplines.userId} = ${viewerUserId})`,
        reviewCount: sql<number>`(
          select count(*)::integer from ${reviews}
          where ${reviews.disciplineId} = ${disciplines.id} and ${reviews.status} = 'published'
        )`,
        averageRating: sql<number | null>`(
          select avg(${reviews.rating})::double precision from ${reviews}
          where ${reviews.disciplineId} = ${disciplines.id} and ${reviews.status} = 'published'
        )`,
      })
      .from(disciplines)
      .innerJoin(departments, eq(departments.id, disciplines.departmentId))
      .where(eq(disciplines.id, id))
      .limit(1);
    const row = rows.at(0);

    if (row === undefined) {
      return undefined;
    }

    const [courseRows, professorRows] = await Promise.all([
      db
        .select({ id: courses.id, name: courses.name })
        .from(courseDisciplines)
        .innerJoin(courses, eq(courses.id, courseDisciplines.courseId))
        .where(eq(courseDisciplines.disciplineId, id))
        .orderBy(asc(courses.id)),
      db
        .select({ id: professors.id, name: professors.name })
        .from(professorDisciplines)
        .innerJoin(professors, eq(professors.id, professorDisciplines.professorId))
        .where(eq(professorDisciplines.disciplineId, id))
        .orderBy(asc(professors.id)),
    ]);
    const discipline: DisciplineBase = {
      id: row.id,
      code: row.code,
      name: row.name,
      workloadHours: row.workloadHours,
      reviewCount: row.reviewCount,
      averageRating: row.averageRating,
      department: { id: row.departmentId, name: row.departmentName },
    };

    return { ...discipline, isFavorite: row.isFavorite, courses: courseRows, professors: professorRows };
  }

  return { findDisciplineById, listDisciplines };
}

export type DisciplinesRepository = ReturnType<typeof createDisciplinesRepository>;
