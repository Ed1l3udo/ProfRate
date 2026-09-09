import { and, asc, count, eq, ilike, sql } from "drizzle-orm";

import type { Database } from "../../db/database.js";
import { professors, reviews } from "../../db/schema.js";
import type { ProfessorFilters } from "./schemas.js";

export function createProfessorsRepository(db: Database) {
  async function listProfessors(filters: ProfessorFilters = {}) {
    return db
      .select({
        id: professors.id,
        name: professors.name,
        department: professors.department,
        reviewCount: count(reviews.id),
        averageRating: sql<number | null>`avg(${reviews.rating})::double precision`,
      })
      .from(professors)
      .leftJoin(reviews, eq(reviews.professorId, professors.id))
      .where(
        and(
          filters.search === undefined
            ? undefined
            : ilike(professors.name, `%${filters.search}%`),
          filters.department === undefined
            ? undefined
            : ilike(professors.department, `%${filters.department}%`),
        ),
      )
      .groupBy(professors.id, professors.name, professors.department)
      .orderBy(asc(professors.id));
  }

  async function findProfessorById(id: number) {
    const professorsFound = await db
      .select({
        id: professors.id,
        name: professors.name,
        department: professors.department,
      })
      .from(professors)
      .where(eq(professors.id, id))
      .limit(1);

    return professorsFound.at(0);
  }

  return { findProfessorById, listProfessors };
}

export type ProfessorsRepository = ReturnType<
  typeof createProfessorsRepository
>;
