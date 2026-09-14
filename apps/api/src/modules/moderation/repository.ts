import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import { courses, disciplines, professors, reviews, users } from "../../db/schema.js";

export function createModerationRepository(db: Database) {
  async function listReviews(status = "pending") {
    return db.select({ id: reviews.id, status: reviews.status, rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt, updatedAt: reviews.updatedAt, didactics: reviews.didactics, clarity: reviews.clarity, punctuality: reviews.punctuality, availability: reviews.availability, difficulty: reviews.difficulty, relevance: reviews.relevance, workload: reviews.workload, author: { id: users.id, name: users.name, email: users.email }, professor: { id: professors.id, name: professors.name }, discipline: { id: disciplines.id, code: disciplines.code, name: disciplines.name } }).from(reviews).leftJoin(users, eq(users.id, reviews.authorId)).leftJoin(professors, eq(professors.id, reviews.professorId)).leftJoin(disciplines, eq(disciplines.id, reviews.disciplineId)).where(eq(reviews.status, status as "pending" | "published" | "removed")).orderBy(asc(reviews.createdAt));
  }
  async function setReviewStatus(input: { id: number; status: "published" | "removed" }) {
    const current = (await db.select({ status: reviews.status }).from(reviews).where(eq(reviews.id, input.id)).limit(1)).at(0);
    if (!current) return undefined;
    if (current.status === "removed" && current.status !== input.status) return "conflict" as const;
    if (current.status === "published" && input.status === "published") return { id: input.id, status: current.status };
    if (current.status === input.status) return { id: input.id, status: current.status };
    return (await db.update(reviews).set({ status: input.status, updatedAt: sql`now()` }).where(eq(reviews.id, input.id)).returning({ id: reviews.id, status: reviews.status })).at(0);
  }
  async function listUsers(search?: string) {
    return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, blocked: users.blocked, active: users.active, course: { id: courses.id, name: courses.name } }).from(users).leftJoin(courses, eq(courses.id, users.courseId)).where(search ? or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)) : undefined).orderBy(asc(users.id));
  }
  async function setBlocked(input: { id: number; blocked: boolean }) {
    return (await db.update(users).set({ blocked: input.blocked, updatedAt: sql`now()` }).where(eq(users.id, input.id)).returning({ id: users.id, name: users.name, email: users.email, role: users.role, blocked: users.blocked })).at(0);
  }
  return { listReviews, setReviewStatus, listUsers, setBlocked };
}
export type ModerationRepository = ReturnType<typeof createModerationRepository>;
