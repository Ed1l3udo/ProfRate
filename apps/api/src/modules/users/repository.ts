import { eq, sql } from "drizzle-orm";

import type { Database } from "../../db/database.js";
import { courses, users } from "../../db/schema.js";

export type UserRole = "student" | "moderator";

function userSelection() {
  return {
    id: users.id,
    name: users.name,
    email: users.email,
    passwordHash: users.passwordHash,
    role: users.role,
    courseId: users.courseId,
    active: users.active,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    courseName: courses.name,
  };
}

export function createUsersRepository(db: Database) {
  async function findUserById(id: number) {
    const rows = await db
      .select(userSelection())
      .from(users)
      .leftJoin(courses, eq(courses.id, users.courseId))
      .where(eq(users.id, id))
      .limit(1);
    const row = rows.at(0);

    if (row === undefined) return undefined;

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      passwordHash: row.passwordHash,
      role: row.role,
      courseId: row.courseId,
      course: row.courseId === null || row.courseName === null
        ? null
        : { id: row.courseId, name: row.courseName },
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async function findUserByEmail(email: string) {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const id = rows.at(0)?.id;

    return id === undefined ? undefined : findUserById(id);
  }

  async function createStudent({
    name,
    email,
    passwordHash,
    courseId,
  }: {
    name: string;
    email: string;
    passwordHash: string;
    courseId: number;
  }) {
    const rows = await db
      .insert(users)
      .values({ name, email, passwordHash, courseId, role: "student" })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id });
    const id = rows.at(0)?.id;

    return id === undefined ? undefined : findUserById(id);
  }

  async function updateProfile({
    id,
    name,
    courseId,
  }: {
    id: number;
    name?: string;
    courseId?: number;
  }) {
    await db
      .update(users)
      .set({ name, courseId, updatedAt: sql`now()` })
      .where(eq(users.id, id));

    return findUserById(id);
  }

  return { createStudent, findUserByEmail, findUserById, updateProfile };
}

export type UsersRepository = ReturnType<typeof createUsersRepository>;
export type UserRecord = NonNullable<Awaited<ReturnType<UsersRepository["findUserById"]>>>;

export function publicUser(user: UserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    course: user.course,
  };
}
