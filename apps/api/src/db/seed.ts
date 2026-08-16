import { eq } from "drizzle-orm";

import { closeDatabase, db } from "./client.js";
import { professors } from "./schema.js";

try {
  const seedProfessors = [
    { name: "Ada Ribeiro", department: "Departamento Aurora" },
    { name: "Caio Nogueira", department: "Departamento Horizonte" },
    { name: "Lina Vasconcelos", department: "Departamento Pioneiro" },
  ];

  await db.transaction(async (transaction) => {
    const existingProfessors = await transaction
      .select({ id: professors.id, name: professors.name })
      .from(professors);
    const existingProfessorIds = new Map(
      existingProfessors.map((professor) => [professor.name, professor.id]),
    );

    for (const professor of seedProfessors) {
      const existingProfessorId = existingProfessorIds.get(professor.name);

      if (existingProfessorId !== undefined) {
        await transaction
          .update(professors)
          .set({ department: professor.department })
          .where(eq(professors.id, existingProfessorId));
      } else {
        await transaction.insert(professors).values(professor);
      }
    }
  });

  console.log("Professor seed completed.");
} catch (error) {
  console.error("Database seed failed.", error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
