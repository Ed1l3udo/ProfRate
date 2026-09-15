import { Router, type RequestHandler } from "express";

import type { AdminRepository } from "./repository.js";
import {
  adminConflictError,
  adminCourseBodySchema,
  adminCourseParamsSchema,
  adminDepartmentBodySchema,
  adminDepartmentParamsSchema,
  adminDisciplineBodySchema,
  adminDisciplineParamsSchema,
  adminProfessorBodySchema,
  adminProfessorParamsSchema,
  adminResourceInUseError,
  courseNotFoundError,
  departmentNotFoundError,
  disciplineNotFoundError,
  invalidAdminInputError,
  professorNotFoundError,
} from "./schemas.js";

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "23505") return true;
  return "cause" in error && isUniqueViolation(error.cause);
}

function resourceError(response: Parameters<RequestHandler>[1], result: unknown) {
  if (result === "conflict") return response.status(409).json({ error: adminConflictError });
  if (result === "department-not-found") return response.status(404).json({ error: departmentNotFoundError });
  if (result === "course-not-found") return response.status(404).json({ error: courseNotFoundError });
  if (result === "discipline-not-found") return response.status(404).json({ error: disciplineNotFoundError });
  return undefined;
}

export function createAdminRouter({ repository, requireAuthentication, requireAdmin }: {
  repository: AdminRepository;
  requireAuthentication: RequestHandler;
  requireAdmin: RequestHandler;
}) {
  const router = Router();
  router.use(requireAuthentication, requireAdmin);

  router.get("/departments", async (_request, response) => response.status(200).json(await repository.listAdminDepartments()));
  router.post("/departments", async (request, response) => {
    const body = adminDepartmentBodySchema.safeParse(request.body);
    if (!body.success) return response.status(400).json({ error: invalidAdminInputError });
    try {
      const result = await repository.createDepartment(body.data);
      const error = resourceError(response, result); if (error) return error;
      return response.status(201).json(result);
    } catch (error) { return isUniqueViolation(error) ? response.status(409).json({ error: adminConflictError }) : Promise.reject(error); }
  });
  router.patch("/departments/:departmentId", async (request, response) => {
    const params = adminDepartmentParamsSchema.safeParse(request.params); const body = adminDepartmentBodySchema.safeParse(request.body);
    if (!params.success || !body.success) return response.status(400).json({ error: invalidAdminInputError });
    try {
      const result = await repository.updateDepartment(params.data.departmentId, body.data);
      if (!result) return response.status(404).json({ error: departmentNotFoundError });
      return response.status(200).json(result);
    } catch (error) { return isUniqueViolation(error) ? response.status(409).json({ error: adminConflictError }) : Promise.reject(error); }
  });
  router.delete("/departments/:departmentId", async (request, response) => {
    const params = adminDepartmentParamsSchema.safeParse(request.params); if (!params.success) return response.status(400).json({ error: invalidAdminInputError });
    const result = await repository.deleteDepartment(params.data.departmentId);
    if (!result) return response.status(404).json({ error: departmentNotFoundError });
    return result === "in-use" ? response.status(409).json({ error: adminResourceInUseError }) : response.status(204).end();
  });

  router.get("/courses", async (_request, response) => response.status(200).json(await repository.listAdminCourses()));
  router.post("/courses", async (request, response) => {
    const body = adminCourseBodySchema.safeParse(request.body); if (!body.success) return response.status(400).json({ error: invalidAdminInputError });
    try { const result = await repository.createCourse(body.data); const error = resourceError(response, result); if (error) return error; return response.status(201).json(result); }
    catch (error) { return isUniqueViolation(error) ? response.status(409).json({ error: adminConflictError }) : Promise.reject(error); }
  });
  router.patch("/courses/:courseId", async (request, response) => {
    const params = adminCourseParamsSchema.safeParse(request.params); const body = adminCourseBodySchema.safeParse(request.body);
    if (!params.success || !body.success) return response.status(400).json({ error: invalidAdminInputError });
    try { const result = await repository.updateCourse(params.data.courseId, body.data); if (!result) return response.status(404).json({ error: courseNotFoundError }); const error = resourceError(response, result); if (error) return error; return response.status(200).json(result); }
    catch (error) { return isUniqueViolation(error) ? response.status(409).json({ error: adminConflictError }) : Promise.reject(error); }
  });
  router.delete("/courses/:courseId", async (request, response) => {
    const params = adminCourseParamsSchema.safeParse(request.params); if (!params.success) return response.status(400).json({ error: invalidAdminInputError });
    const result = await repository.deleteCourse(params.data.courseId); if (!result) return response.status(404).json({ error: courseNotFoundError });
    return result === "in-use" ? response.status(409).json({ error: adminResourceInUseError }) : response.status(204).end();
  });

  router.get("/disciplines", async (_request, response) => response.status(200).json(await repository.listAdminDisciplines()));
  router.post("/disciplines", async (request, response) => {
    const body = adminDisciplineBodySchema.safeParse(request.body); if (!body.success) return response.status(400).json({ error: invalidAdminInputError });
    try { const result = await repository.createDiscipline(body.data); const error = resourceError(response, result); if (error) return error; return response.status(201).json(result); }
    catch (error) { return isUniqueViolation(error) ? response.status(409).json({ error: adminConflictError }) : Promise.reject(error); }
  });
  router.patch("/disciplines/:disciplineId", async (request, response) => {
    const params = adminDisciplineParamsSchema.safeParse(request.params); const body = adminDisciplineBodySchema.safeParse(request.body);
    if (!params.success || !body.success) return response.status(400).json({ error: invalidAdminInputError });
    try { const result = await repository.updateDiscipline(params.data.disciplineId, body.data); if (!result) return response.status(404).json({ error: disciplineNotFoundError }); const error = resourceError(response, result); if (error) return error; return response.status(200).json(result); }
    catch (error) { return isUniqueViolation(error) ? response.status(409).json({ error: adminConflictError }) : Promise.reject(error); }
  });
  router.delete("/disciplines/:disciplineId", async (request, response) => {
    const params = adminDisciplineParamsSchema.safeParse(request.params); if (!params.success) return response.status(400).json({ error: invalidAdminInputError });
    const result = await repository.deleteDiscipline(params.data.disciplineId); if (!result) return response.status(404).json({ error: disciplineNotFoundError });
    return result === "in-use" ? response.status(409).json({ error: adminResourceInUseError }) : response.status(204).end();
  });

  router.get("/professors", async (_request, response) => response.status(200).json(await repository.listAdminProfessors()));
  router.post("/professors", async (request, response) => {
    const body = adminProfessorBodySchema.safeParse(request.body); if (!body.success) return response.status(400).json({ error: invalidAdminInputError });
    try { const result = await repository.createProfessor(body.data); const error = resourceError(response, result); if (error) return error; return response.status(201).json(result); }
    catch (error) { return isUniqueViolation(error) ? response.status(409).json({ error: adminConflictError }) : Promise.reject(error); }
  });
  router.patch("/professors/:professorId", async (request, response) => {
    const params = adminProfessorParamsSchema.safeParse(request.params); const body = adminProfessorBodySchema.safeParse(request.body);
    if (!params.success || !body.success) return response.status(400).json({ error: invalidAdminInputError });
    try { const result = await repository.updateProfessor(params.data.professorId, body.data); if (!result) return response.status(404).json({ error: professorNotFoundError }); const error = resourceError(response, result); if (error) return error; return response.status(200).json(result); }
    catch (error) { return isUniqueViolation(error) ? response.status(409).json({ error: adminConflictError }) : Promise.reject(error); }
  });
  router.delete("/professors/:professorId", async (request, response) => {
    const params = adminProfessorParamsSchema.safeParse(request.params); if (!params.success) return response.status(400).json({ error: invalidAdminInputError });
    const result = await repository.deleteProfessor(params.data.professorId); if (!result) return response.status(404).json({ error: professorNotFoundError });
    return result === "in-use" ? response.status(409).json({ error: adminResourceInUseError }) : response.status(204).end();
  });
  return router;
}
