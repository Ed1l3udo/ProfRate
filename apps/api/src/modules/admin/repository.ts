import { and, asc, eq, inArray, sql } from "drizzle-orm";

import type { Database } from "../../db/database.js";
import {
  courseDisciplines,
  courses,
  departments,
  disciplines,
  professorDisciplines,
  professors,
  reviews,
  users,
} from "../../db/schema.js";
import type { AdminCourseBody, AdminDepartmentBody, AdminDisciplineBody, AdminProfessorBody } from "./schemas.js";

type Related = { id: number; name: string };

function groupRelations(rows: Array<{ ownerId: number; id: number; name: string }>) {
  const grouped = new Map<number, Related[]>();
  for (const row of rows) grouped.set(row.ownerId, [...(grouped.get(row.ownerId) ?? []), { id: row.id, name: row.name }]);
  return grouped;
}

export function createAdminRepository(db: Database) {
  async function listAdminDepartments() {
    return db.select({ id: departments.id, name: departments.name }).from(departments).orderBy(asc(departments.id));
  }

  async function listAdminCourses() {
    return db.select({ id: courses.id, name: courses.name, department: { id: departments.id, name: departments.name } })
      .from(courses).innerJoin(departments, eq(departments.id, courses.departmentId)).orderBy(asc(courses.id));
  }

  async function listAdminDisciplines() {
    const rows = await db.select({ id: disciplines.id, code: disciplines.code, name: disciplines.name, workloadHours: disciplines.workloadHours, department: { id: departments.id, name: departments.name } })
      .from(disciplines).innerJoin(departments, eq(departments.id, disciplines.departmentId)).orderBy(asc(disciplines.id));
    if (rows.length === 0) return [];
    const courseRows = await db.select({ ownerId: courseDisciplines.disciplineId, id: courses.id, name: courses.name })
      .from(courseDisciplines).innerJoin(courses, eq(courses.id, courseDisciplines.courseId))
      .where(inArray(courseDisciplines.disciplineId, rows.map((row) => row.id))).orderBy(asc(courseDisciplines.disciplineId), asc(courses.id));
    const related = groupRelations(courseRows);
    return rows.map((row) => ({ ...row, courses: related.get(row.id) ?? [] }));
  }

  async function listAdminProfessors() {
    const rows = await db.select({ id: professors.id, name: professors.name, department: { id: departments.id, name: departments.name } })
      .from(professors).innerJoin(departments, eq(departments.id, professors.departmentId)).orderBy(asc(professors.id));
    if (rows.length === 0) return [];
    const disciplineRows = await db.select({ ownerId: professorDisciplines.professorId, id: disciplines.id, name: disciplines.name })
      .from(professorDisciplines).innerJoin(disciplines, eq(disciplines.id, professorDisciplines.disciplineId))
      .where(inArray(professorDisciplines.professorId, rows.map((row) => row.id))).orderBy(asc(professorDisciplines.professorId), asc(disciplines.id));
    const related = groupRelations(disciplineRows);
    return rows.map((row) => ({ ...row, disciplines: related.get(row.id) ?? [] }));
  }

  async function findAdminDepartment(id: number) {
    return (await listAdminDepartments()).find((item) => item.id === id);
  }
  async function findAdminCourse(id: number) {
    return (await listAdminCourses()).find((item) => item.id === id);
  }
  async function findAdminDiscipline(id: number) {
    return (await listAdminDisciplines()).find((item) => item.id === id);
  }
  async function findAdminProfessor(id: number) {
    return (await listAdminProfessors()).find((item) => item.id === id);
  }

  async function createDepartment(input: AdminDepartmentBody) {
    const row = (await db.insert(departments).values(input).onConflictDoNothing().returning({ id: departments.id })).at(0);
    return row === undefined ? "conflict" as const : findAdminDepartment(row.id);
  }
  async function updateDepartment(id: number, input: AdminDepartmentBody) {
    const row = (await db.update(departments).set(input).where(eq(departments.id, id)).returning({ id: departments.id })).at(0);
    return row === undefined ? undefined : findAdminDepartment(row.id);
  }
  async function deleteDepartment(id: number) {
    return db.transaction(async (tx) => {
      const found = (await tx.select({ id: departments.id }).from(departments).where(eq(departments.id, id)).for("update").limit(1)).at(0);
      if (!found) return undefined;
      const [courseReference, disciplineReference, professorReference] = await Promise.all([
        tx.select({ id: courses.id }).from(courses).where(eq(courses.departmentId, id)).limit(1),
        tx.select({ id: disciplines.id }).from(disciplines).where(eq(disciplines.departmentId, id)).limit(1),
        tx.select({ id: professors.id }).from(professors).where(eq(professors.departmentId, id)).limit(1),
      ]);
      if (courseReference.length || disciplineReference.length || professorReference.length) return "in-use" as const;
      await tx.delete(departments).where(eq(departments.id, id));
      return "deleted" as const;
    });
  }

  async function createCourse(input: AdminCourseBody) {
    const department = await db.select({ id: departments.id }).from(departments).where(eq(departments.id, input.departmentId)).limit(1);
    if (department.length === 0) return "department-not-found" as const;
    const row = (await db.insert(courses).values(input).onConflictDoNothing().returning({ id: courses.id })).at(0);
    return row === undefined ? "conflict" as const : findAdminCourse(row.id);
  }
  async function updateCourse(id: number, input: AdminCourseBody) {
    const department = await db.select({ id: departments.id }).from(departments).where(eq(departments.id, input.departmentId)).limit(1);
    if (department.length === 0) return "department-not-found" as const;
    const row = (await db.update(courses).set(input).where(eq(courses.id, id)).returning({ id: courses.id })).at(0);
    return row === undefined ? undefined : findAdminCourse(row.id);
  }
  async function deleteCourse(id: number) {
    return db.transaction(async (tx) => {
      const found = (await tx.select({ id: courses.id }).from(courses).where(eq(courses.id, id)).for("update").limit(1)).at(0);
      if (!found) return undefined;
      const [userReference, disciplineReference] = await Promise.all([
        tx.select({ id: users.id }).from(users).where(eq(users.courseId, id)).limit(1),
        tx.select({ courseId: courseDisciplines.courseId }).from(courseDisciplines).where(eq(courseDisciplines.courseId, id)).limit(1),
      ]);
      if (userReference.length || disciplineReference.length) return "in-use" as const;
      await tx.delete(courses).where(eq(courses.id, id));
      return "deleted" as const;
    });
  }

  async function saveDiscipline(id: number | undefined, input: AdminDisciplineBody) {
    return db.transaction(async (tx) => {
      const department = await tx.select({ id: departments.id }).from(departments).where(eq(departments.id, input.departmentId)).limit(1);
      if (!department.length) return "department-not-found" as const;
      if (input.courseIds.length) {
        const foundCourses = await tx.select({ id: courses.id }).from(courses).where(inArray(courses.id, input.courseIds));
        if (foundCourses.length !== input.courseIds.length) return "course-not-found" as const;
      }
      const saved = id === undefined
        ? (await tx.insert(disciplines).values({ code: input.code, name: input.name, departmentId: input.departmentId, workloadHours: input.workloadHours }).onConflictDoNothing().returning({ id: disciplines.id })).at(0)
        : (await tx.update(disciplines).set({ code: input.code, name: input.name, departmentId: input.departmentId, workloadHours: input.workloadHours }).where(eq(disciplines.id, id)).returning({ id: disciplines.id })).at(0);
      if (!saved) return id === undefined ? "conflict" as const : undefined;
      if (id !== undefined) await tx.delete(courseDisciplines).where(eq(courseDisciplines.disciplineId, id));
      if (input.courseIds.length) await tx.insert(courseDisciplines).values(input.courseIds.map((courseId) => ({ courseId, disciplineId: saved.id })));
      return saved.id;
    });
  }
  async function createDiscipline(input: AdminDisciplineBody) {
    const result = await saveDiscipline(undefined, input);
    return typeof result === "number" ? findAdminDiscipline(result) : result;
  }
  async function updateDiscipline(id: number, input: AdminDisciplineBody) {
    const result = await saveDiscipline(id, input);
    return typeof result === "number" ? findAdminDiscipline(result) : result;
  }
  async function deleteDiscipline(id: number) {
    return db.transaction(async (tx) => {
      const found = (await tx.select({ id: disciplines.id }).from(disciplines).where(eq(disciplines.id, id)).for("update").limit(1)).at(0);
      if (!found) return undefined;
      const [courseReference, professorReference, reviewReference] = await Promise.all([
        tx.select({ disciplineId: courseDisciplines.disciplineId }).from(courseDisciplines).where(eq(courseDisciplines.disciplineId, id)).limit(1),
        tx.select({ disciplineId: professorDisciplines.disciplineId }).from(professorDisciplines).where(eq(professorDisciplines.disciplineId, id)).limit(1),
        tx.select({ id: reviews.id }).from(reviews).where(eq(reviews.disciplineId, id)).limit(1),
      ]);
      if (courseReference.length || professorReference.length || reviewReference.length) return "in-use" as const;
      await tx.delete(disciplines).where(eq(disciplines.id, id));
      return "deleted" as const;
    });
  }

  async function saveProfessor(id: number | undefined, input: AdminProfessorBody) {
    return db.transaction(async (tx) => {
      const department = await tx.select({ id: departments.id }).from(departments).where(eq(departments.id, input.departmentId)).limit(1);
      if (!department.length) return "department-not-found" as const;
      if (input.disciplineIds.length) {
        const foundDisciplines = await tx.select({ id: disciplines.id }).from(disciplines).where(inArray(disciplines.id, input.disciplineIds));
        if (foundDisciplines.length !== input.disciplineIds.length) return "discipline-not-found" as const;
      }
      const saved = id === undefined
        ? (await tx.insert(professors).values({ name: input.name, departmentId: input.departmentId }).returning({ id: professors.id })).at(0)
        : (await tx.update(professors).set({ name: input.name, departmentId: input.departmentId }).where(eq(professors.id, id)).returning({ id: professors.id })).at(0);
      if (!saved) return undefined;
      if (id !== undefined) await tx.delete(professorDisciplines).where(eq(professorDisciplines.professorId, id));
      if (input.disciplineIds.length) await tx.insert(professorDisciplines).values(input.disciplineIds.map((disciplineId) => ({ disciplineId, professorId: saved.id })));
      return saved.id;
    });
  }
  async function createProfessor(input: AdminProfessorBody) {
    const result = await saveProfessor(undefined, input);
    return typeof result === "number" ? findAdminProfessor(result) : result;
  }
  async function updateProfessor(id: number, input: AdminProfessorBody) {
    const result = await saveProfessor(id, input);
    return typeof result === "number" ? findAdminProfessor(result) : result;
  }
  async function deleteProfessor(id: number) {
    return db.transaction(async (tx) => {
      const found = (await tx.select({ id: professors.id }).from(professors).where(eq(professors.id, id)).for("update").limit(1)).at(0);
      if (!found) return undefined;
      const [disciplineReference, reviewReference] = await Promise.all([
        tx.select({ professorId: professorDisciplines.professorId }).from(professorDisciplines).where(eq(professorDisciplines.professorId, id)).limit(1),
        tx.select({ id: reviews.id }).from(reviews).where(eq(reviews.professorId, id)).limit(1),
      ]);
      if (disciplineReference.length || reviewReference.length) return "in-use" as const;
      await tx.delete(professors).where(eq(professors.id, id));
      return "deleted" as const;
    });
  }

  return { listAdminDepartments, listAdminCourses, listAdminDisciplines, listAdminProfessors, createDepartment, updateDepartment, deleteDepartment, createCourse, updateCourse, deleteCourse, createDiscipline, updateDiscipline, deleteDiscipline, createProfessor, updateProfessor, deleteProfessor };
}

export type AdminRepository = ReturnType<typeof createAdminRepository>;
