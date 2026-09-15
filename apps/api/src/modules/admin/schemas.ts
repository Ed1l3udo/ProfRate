import { z } from "zod";

const id = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().positive().max(2_147_483_647));
const name = z.string().trim().min(2).max(120);
const disciplineCode = z.string().trim().toUpperCase().regex(/^[A-Z]{3}\d{3}$/);
const workloadHours = z.number().int().positive().max(1_000);
const idArray = z.array(z.number().int().positive().max(2_147_483_647)).refine((values) => new Set(values).size === values.length, "IDs must be unique.");

export const adminDepartmentParamsSchema = z.object({ departmentId: id }).strict();
export const adminCourseParamsSchema = z.object({ courseId: id }).strict();
export const adminDisciplineParamsSchema = z.object({ disciplineId: id }).strict();
export const adminProfessorParamsSchema = z.object({ professorId: id }).strict();

export const adminDepartmentBodySchema = z.object({ name }).strict();
export const adminCourseBodySchema = z.object({ name, departmentId: z.number().int().positive().max(2_147_483_647) }).strict();
export const adminDisciplineBodySchema = z.object({ code: disciplineCode, name, departmentId: z.number().int().positive().max(2_147_483_647), workloadHours, courseIds: idArray }).strict();
export const adminProfessorBodySchema = z.object({ name, departmentId: z.number().int().positive().max(2_147_483_647), disciplineIds: idArray }).strict();

export const invalidAdminInputError = { code: "INVALID_ADMIN_INPUT", message: "Admin request contains invalid fields." };
export const adminConflictError = { code: "ADMIN_CONFLICT", message: "A catalog resource with these values already exists." };
export const adminResourceInUseError = { code: "ADMIN_RESOURCE_IN_USE", message: "This catalog resource is in use and cannot be deleted." };
export const departmentNotFoundError = { code: "DEPARTMENT_NOT_FOUND", message: "Department not found." };
export const courseNotFoundError = { code: "COURSE_NOT_FOUND", message: "Course not found." };
export const disciplineNotFoundError = { code: "DISCIPLINE_NOT_FOUND", message: "Discipline not found." };
export const professorNotFoundError = { code: "PROFESSOR_NOT_FOUND", message: "Professor not found." };

export type AdminDepartmentBody = z.infer<typeof adminDepartmentBodySchema>;
export type AdminCourseBody = z.infer<typeof adminCourseBodySchema>;
export type AdminDisciplineBody = z.infer<typeof adminDisciplineBodySchema>;
export type AdminProfessorBody = z.infer<typeof adminProfessorBodySchema>;
