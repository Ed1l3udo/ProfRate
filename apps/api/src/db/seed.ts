import { closeDatabase, db } from "./client.js";
import { professors } from "./schema.js";

try {
  const existingProfessor = await db
    .select({ id: professors.id })
    .from(professors)
    .limit(1);

  if (existingProfessor.length > 0) {
    console.log("Database already contains professors. Seed skipped.");
  } else {
    await db.insert(professors).values([
      { name: "Ada Ribeiro" },
      { name: "Caio Nogueira" },
      { name: "Lina Vasconcelos" },
    ]);

    console.log("Professor seed completed.");
  }
} catch (error) {
  console.error("Database seed failed.", error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
