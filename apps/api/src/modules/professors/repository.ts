import { asc, eq } from "drizzle-orm";

import { db } from "../../db/client.js";
import { professors } from "../../db/schema.js";

export async function listProfessors() {
  return db
    .select({
      id: professors.id,
      name: professors.name,
    })
    .from(professors)
    .orderBy(asc(professors.id));
}

export async function findProfessorById(id: number) {
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
