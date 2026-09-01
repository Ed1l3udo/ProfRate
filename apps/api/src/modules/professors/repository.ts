import { and, asc, eq, ilike } from "drizzle-orm";

import type { Database } from "../../db/database.js";
import { professors } from "../../db/schema.js";
import type { ProfessorFilters } from "./schemas.js";

export function createProfessorsRepository(db: Database) {
  async function listProfessors(filters: ProfessorFilters = {}) {
    return db
      .select({
        id: professors.id,
        name: professors.name,
        department: professors.department,
      })
      .from(professors)
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
