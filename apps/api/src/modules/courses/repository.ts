import { and, asc, eq } from "drizzle-orm";

import type { Database } from "../../db/database.js";
import { courses, departments } from "../../db/schema.js";
import type { CourseFilters } from "./schemas.js";

export function createCoursesRepository(db: Database) {
  async function findCourseById(id: number) {
    const rows = await db
      .select({ id: courses.id, name: courses.name })
      .from(courses)
      .where(eq(courses.id, id))
      .limit(1);

    return rows.at(0);
  }

  async function listCourses(filters: CourseFilters = {}) {
    return db
      .select({
        id: courses.id,
        name: courses.name,
        departmentId: courses.departmentId,
        department: departments.name,
      })
      .from(courses)
      .innerJoin(departments, eq(departments.id, courses.departmentId))
      .where(
        and(
          filters.departmentId === undefined
            ? undefined
            : eq(courses.departmentId, filters.departmentId),
        ),
      )
      .orderBy(asc(courses.id));
  }

  return { findCourseById, listCourses };
}

export type CoursesRepository = ReturnType<typeof createCoursesRepository>;
