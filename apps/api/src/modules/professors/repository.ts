import { and, asc, count, eq, ilike, sql } from "drizzle-orm";

import type { Database } from "../../db/database.js";
import { departments, favoriteProfessors, professors, reviews } from "../../db/schema.js";
import type { ProfessorFilters } from "./schemas.js";

export function createProfessorsRepository(db: Database) {
  async function listProfessors(filters: ProfessorFilters = {}) {
    return db
      .select({
        id: professors.id,
        name: professors.name,
        department: departments.name,
        reviewCount: count(reviews.id),
        averageRating: sql<number | null>`avg(${reviews.rating})::double precision`,
      })
      .from(professors)
      .innerJoin(departments, eq(departments.id, professors.departmentId))
      .leftJoin(reviews, and(eq(reviews.professorId, professors.id), eq(reviews.status, "published")))
      .where(
        and(
          filters.search === undefined
            ? undefined
            : ilike(professors.name, `%${filters.search}%`),
          filters.department === undefined
            ? undefined
            : ilike(departments.name, `%${filters.department}%`),
        ),
      )
      .groupBy(professors.id, professors.name, departments.name)
      .orderBy(asc(professors.id));
  }

  async function findProfessorById(id: number, viewerUserId?: number) {
    const professorsFound = await db
      .select({
        id: professors.id,
        name: professors.name,
        department: departments.name,
        isFavorite: viewerUserId === undefined ? sql<boolean>`false` : sql<boolean>`exists (select 1 from ${favoriteProfessors} where ${favoriteProfessors.professorId} = ${professors.id} and ${favoriteProfessors.userId} = ${viewerUserId})`,
      })
      .from(professors)
      .innerJoin(departments, eq(departments.id, professors.departmentId))
      .where(eq(professors.id, id))
      .limit(1);

    return professorsFound.at(0);
  }

  return { findProfessorById, listProfessors };
}

export type ProfessorsRepository = ReturnType<
  typeof createProfessorsRepository
>;
