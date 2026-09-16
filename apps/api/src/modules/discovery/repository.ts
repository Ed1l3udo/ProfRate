import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import { courseDisciplines, courses, departments, disciplines, favoriteDisciplines, favoriteProfessors, helpfulReviews, professors, reviews } from "../../db/schema.js";

export function createDiscoveryRepository(db: Database) {
  const listFavorites = async (userId: number) => ({
    professors: await db.select({ id: professors.id, name: professors.name, department: departments.name }).from(favoriteProfessors).innerJoin(professors, eq(professors.id, favoriteProfessors.professorId)).innerJoin(departments, eq(departments.id, professors.departmentId)).where(eq(favoriteProfessors.userId, userId)).orderBy(asc(professors.name), asc(professors.id)),
    disciplines: await db.select({ id: disciplines.id, code: disciplines.code, name: disciplines.name, department: departments.name }).from(favoriteDisciplines).innerJoin(disciplines, eq(disciplines.id, favoriteDisciplines.disciplineId)).innerJoin(departments, eq(departments.id, disciplines.departmentId)).where(eq(favoriteDisciplines.userId, userId)).orderBy(asc(disciplines.name), asc(disciplines.id)),
  });
  const setFavorite = async (kind: "professor" | "discipline", userId: number, resourceId: number) => {
    const table = kind === "professor" ? professors : disciplines;
    const found = await db.select({ id: table.id }).from(table).where(eq(table.id, resourceId)).limit(1);
    if (!found.length) return undefined;
    if (kind === "professor") await db.insert(favoriteProfessors).values({ userId, professorId: resourceId }).onConflictDoNothing();
    else await db.insert(favoriteDisciplines).values({ userId, disciplineId: resourceId }).onConflictDoNothing();
    return true;
  };
  const removeFavorite = async (kind: "professor" | "discipline", userId: number, resourceId: number) => {
    if (kind === "professor") await db.delete(favoriteProfessors).where(and(eq(favoriteProfessors.userId, userId), eq(favoriteProfessors.professorId, resourceId)));
    else await db.delete(favoriteDisciplines).where(and(eq(favoriteDisciplines.userId, userId), eq(favoriteDisciplines.disciplineId, resourceId)));
  };
  const setHelpful = async (userId: number, reviewId: number) => db.transaction(async (tx) => {
    const review = (await tx.select({ id: reviews.id, authorId: reviews.authorId, status: reviews.status }).from(reviews).where(eq(reviews.id, reviewId)).for("update").limit(1)).at(0);
    if (!review || review.status !== "published") return "not-found" as const;
    if (review.authorId === userId) return "own" as const;
    await tx.insert(helpfulReviews).values({ userId, reviewId }).onConflictDoNothing(); return "ok" as const;
  });
  const removeHelpful = async (userId: number, reviewId: number) => { await db.delete(helpfulReviews).where(and(eq(helpfulReviews.userId, userId), eq(helpfulReviews.reviewId, reviewId))); };
  const rankings = async (kind: "professors" | "disciplines", filters: { departmentId?: number; courseId?: number; limit?: number }) => {
    const entity = kind === "professors" ? professors : disciplines;
    const target = kind === "professors" ? reviews.professorId : reviews.disciplineId;
    const rows = await db.select({ id: entity.id, name: entity.name, department: departments.name, reviewCount: count(reviews.id), averageRating: sql<number>`avg(${reviews.rating})::double precision` }).from(entity).innerJoin(departments, eq(departments.id, entity.departmentId)).innerJoin(reviews, and(eq(target, entity.id), eq(reviews.status, "published"))).where(and(filters.departmentId ? eq(entity.departmentId, filters.departmentId) : undefined, kind === "disciplines" && filters.courseId ? sql`exists (select 1 from ${courseDisciplines} where ${courseDisciplines.disciplineId} = ${disciplines.id} and ${courseDisciplines.courseId} = ${filters.courseId})` : undefined)).groupBy(entity.id, entity.name, departments.name).orderBy(desc(sql`avg(${reviews.rating})`), desc(count(reviews.id)), asc(entity.name), asc(entity.id)).limit(filters.limit ?? 10);
    return rows.map((row, index) => ({ position: index + 1, ...row }));
  };
  return { listFavorites, setFavorite, removeFavorite, setHelpful, removeHelpful, rankings };
}
export type DiscoveryRepository = ReturnType<typeof createDiscoveryRepository>;
