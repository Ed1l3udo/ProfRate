import { asc } from "drizzle-orm";

import type { Database } from "../../db/database.js";
import { departments } from "../../db/schema.js";

export function createDepartmentsRepository(db: Database) {
  async function listDepartments() {
    return db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .orderBy(asc(departments.id));
  }

  return { listDepartments };
}

export type DepartmentsRepository = ReturnType<typeof createDepartmentsRepository>;
