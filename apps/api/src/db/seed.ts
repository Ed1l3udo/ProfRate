import { eq } from "drizzle-orm";

import { closeDatabase, db } from "./client.js";
import { professors, reviews } from "./schema.js";

try {
  const seedProfessors = [
    { name: "Ada Ribeiro", department: "Departamento Aurora" },
    { name: "Caio Nogueira", department: "Departamento Horizonte" },
    { name: "Lina Vasconcelos", department: "Departamento Pioneiro" },
  ];
  const seedReviews = [
    {
      professorName: "Ada Ribeiro",
      rating: 5,
      comment: "Explicações claras e atividades bem organizadas.",
    },
    {
      professorName: "Ada Ribeiro",
      rating: 4,
      comment: "Feedbacks úteis durante os exercícios.",
    },
    {
      professorName: "Caio Nogueira",
      rating: 4,
      comment: "Aulas objetivas e exemplos práticos.",
    },
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
        const [insertedProfessor] = await transaction
          .insert(professors)
          .values(professor)
          .returning({ id: professors.id });

        existingProfessorIds.set(professor.name, insertedProfessor.id);
      }
    }

    const existingReviews = await transaction
      .select({
        professorId: reviews.professorId,
        rating: reviews.rating,
        comment: reviews.comment,
      })
      .from(reviews);
    const existingReviewKeys = new Set(
      existingReviews.map(
        (review) => `${review.professorId}:${review.rating}:${review.comment}`,
      ),
    );

    for (const review of seedReviews) {
      const professorId = existingProfessorIds.get(review.professorName);

      if (professorId === undefined) {
        throw new Error(`Seed professor not found: ${review.professorName}`);
      }

      const reviewKey = `${professorId}:${review.rating}:${review.comment}`;

      if (!existingReviewKeys.has(reviewKey)) {
        await transaction.insert(reviews).values({
          professorId,
          rating: review.rating,
          comment: review.comment,
        });
        existingReviewKeys.add(reviewKey);
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
