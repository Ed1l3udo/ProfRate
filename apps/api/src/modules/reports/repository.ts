import { asc, eq, sql } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import { disciplines, professors, reports, reviews, users } from "../../db/schema.js";

export function createReportsRepository(db: Database) {
  async function findReviewForReport(id: number) {
    return (await db.select({ id: reviews.id, authorId: reviews.authorId, status: reviews.status }).from(reviews).where(eq(reviews.id, id)).limit(1)).at(0);
  }
  async function createReport(input: { reviewId: number; reporterId: number; reason: string }) {
    const rows = await db.insert(reports).values(input).onConflictDoNothing().returning({ id: reports.id, reviewId: reports.reviewId, reason: reports.reason, status: reports.status, createdAt: reports.createdAt, resolvedAt: reports.resolvedAt });
    return rows.at(0);
  }
  async function listReports(status = "pending") {
    return db.select({
      id: reports.id,
      reviewId: reports.reviewId,
      reason: reports.reason,
      status: reports.status,
      createdAt: reports.createdAt,
      resolvedAt: reports.resolvedAt,
      reporter: { id: users.id, name: users.name, email: users.email },
      review: {
        id: reviews.id,
        status: reviews.status,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        didactics: reviews.didactics,
        clarity: reviews.clarity,
        punctuality: reviews.punctuality,
        availability: reviews.availability,
        difficulty: reviews.difficulty,
        relevance: reviews.relevance,
        workload: reviews.workload,
      },
      professor: { id: professors.id, name: professors.name },
      discipline: { id: disciplines.id, code: disciplines.code, name: disciplines.name },
    })
      .from(reports)
      .innerJoin(users, eq(users.id, reports.reporterId))
      .innerJoin(reviews, eq(reviews.id, reports.reviewId))
      .leftJoin(professors, eq(professors.id, reviews.professorId))
      .leftJoin(disciplines, eq(disciplines.id, reviews.disciplineId))
      .where(eq(reports.status, status as "pending" | "resolved" | "dismissed"))
      .orderBy(asc(reports.createdAt));
  }
  async function resolveReport(input: { id: number; status: "resolved" | "dismissed"; moderatorId: number }) {
    const current = (await db.select({ status: reports.status }).from(reports).where(eq(reports.id, input.id)).limit(1)).at(0);
    if (!current) return undefined;
    if (current.status !== "pending" && current.status !== input.status) return "conflict" as const;
    if (current.status === input.status) return (await db.select({ id: reports.id, status: reports.status }).from(reports).where(eq(reports.id, input.id))).at(0);
    return (await db.update(reports).set({ status: input.status, resolvedAt: sql`now()`, resolvedBy: input.moderatorId }).where(eq(reports.id, input.id)).returning({ id: reports.id, status: reports.status, resolvedAt: reports.resolvedAt })).at(0);
  }
  return { findReviewForReport, createReport, listReports, resolveReport };
}
export type ReportsRepository = ReturnType<typeof createReportsRepository>;
