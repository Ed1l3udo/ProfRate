import { asc } from "drizzle-orm";

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
