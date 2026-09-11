import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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

export const reviews = pgTable(
  "reviews",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    professorId: integer("professor_id")
      .notNull()
      .references(() => professors.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("reviews_rating_between_1_and_5", sql`${table.rating} BETWEEN 1 AND 5`),
    check("reviews_comment_not_blank", sql`length(trim(${table.comment})) > 0`),
    check("reviews_comment_max_500", sql`char_length(${table.comment}) <= 500`),
  ],
);
