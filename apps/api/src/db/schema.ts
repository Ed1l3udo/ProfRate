import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  pgEnum,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["student", "moderator"]);

export const departments = pgTable("departments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
});

export const professors = pgTable(
  "professors",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id),
  },
  (table) => [index("professors_department_id_idx").on(table.departmentId)],
);

export const courses = pgTable(
  "courses",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id),
  },
  (table) => [
    uniqueIndex("courses_name_department_id_unique").on(
      table.name,
      table.departmentId,
    ),
    index("courses_department_id_idx").on(table.departmentId),
  ],
);

export const disciplines = pgTable(
  "disciplines",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id),
    workloadHours: integer("workload_hours").notNull(),
  },
  (table) => [
    check("disciplines_workload_hours_positive", sql`${table.workloadHours} > 0`),
    index("disciplines_department_id_idx").on(table.departmentId),
  ],
);

export const professorDisciplines = pgTable(
  "professor_disciplines",
  {
    professorId: integer("professor_id")
      .notNull()
      .references(() => professors.id, { onDelete: "cascade" }),
    disciplineId: integer("discipline_id")
      .notNull()
      .references(() => disciplines.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.professorId, table.disciplineId] }),
    index("professor_disciplines_discipline_id_idx").on(table.disciplineId),
  ],
);

export const courseDisciplines = pgTable(
  "course_disciplines",
  {
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    disciplineId: integer("discipline_id")
      .notNull()
      .references(() => disciplines.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.courseId, table.disciplineId] }),
    index("course_disciplines_discipline_id_idx").on(table.disciplineId),
  ],
);

export const users = pgTable(
  "users",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull(),
    courseId: integer("course_id").references(() => courses.id),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("users_name_not_blank", sql`length(trim(${table.name})) > 0`),
    check("users_email_lowercase", sql`${table.email} = lower(${table.email})`),
    check(
      "users_student_requires_course",
      sql`${table.role} <> 'student' OR ${table.courseId} IS NOT NULL`,
    ),
    index("users_course_id_idx").on(table.courseId),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    professorId: integer("professor_id")
      .references(() => professors.id, { onDelete: "cascade" }),
    disciplineId: integer("discipline_id").references(() => disciplines.id, {
      onDelete: "cascade",
    }),
    authorId: integer("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    didactics: integer("didactics"),
    clarity: integer("clarity"),
    punctuality: integer("punctuality"),
    availability: integer("availability"),
    difficulty: integer("difficulty"),
    relevance: integer("relevance"),
    workload: integer("workload"),
    rating: doublePrecision("rating")
      .notNull()
      .generatedAlwaysAs(sql`case
        when "professor_id" is not null then
          ("didactics" + "clarity" + "punctuality" + "availability") / 4.0
        else
          ("difficulty" + "relevance" + "workload") / 3.0
      end`),
    comment: text("comment").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "reviews_exactly_one_target",
      sql`(${table.professorId} is not null) <> (${table.disciplineId} is not null)`,
    ),
    check(
      "reviews_professor_ratings_shape",
      sql`${table.professorId} is null or (
        ${table.didactics} is not null and
        ${table.clarity} is not null and
        ${table.punctuality} is not null and
        ${table.availability} is not null and
        ${table.difficulty} is null and
        ${table.relevance} is null and
        ${table.workload} is null
      )`,
    ),
    check(
      "reviews_discipline_ratings_shape",
      sql`${table.disciplineId} is null or (
        ${table.difficulty} is not null and
        ${table.relevance} is not null and
        ${table.workload} is not null and
        ${table.didactics} is null and
        ${table.clarity} is null and
        ${table.punctuality} is null and
        ${table.availability} is null
      )`,
    ),
    check(
      "reviews_ratings_between_1_and_5",
      sql`(${table.didactics} is null or ${table.didactics} between 1 and 5) and
        (${table.clarity} is null or ${table.clarity} between 1 and 5) and
        (${table.punctuality} is null or ${table.punctuality} between 1 and 5) and
        (${table.availability} is null or ${table.availability} between 1 and 5) and
        (${table.difficulty} is null or ${table.difficulty} between 1 and 5) and
        (${table.relevance} is null or ${table.relevance} between 1 and 5) and
        (${table.workload} is null or ${table.workload} between 1 and 5)`,
    ),
    check("reviews_comment_not_blank", sql`length(trim(${table.comment})) > 0`),
    check("reviews_comment_max_500", sql`char_length(${table.comment}) <= 500`),
    index("reviews_professor_id_idx").on(table.professorId),
    index("reviews_discipline_id_idx").on(table.disciplineId),
    index("reviews_author_id_idx").on(table.authorId),
  ],
);
