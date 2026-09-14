import { and, eq, isNull } from "drizzle-orm";

import { closeDatabase, db } from "./client.js";
import { createPasswordService } from "../modules/auth/password.js";
import {
  courseDisciplines,
  courses,
  departments,
  disciplines,
  professorDisciplines,
  professors,
  reports,
  reviews,
  users,
} from "./schema.js";

const passwordService = createPasswordService();

const seedDepartments = [
  "Departamento Aurora",
  "Departamento Horizonte",
  "Departamento Pioneiro",
];

const seedCourses = [
  { name: "Computação Aplicada", department: "Departamento Aurora" },
  { name: "Sistemas Digitais", department: "Departamento Horizonte" },
  { name: "Ciência de Dados", department: "Departamento Pioneiro" },
];

const seedProfessors = [
  { name: "Ada Ribeiro", department: "Departamento Aurora" },
  { name: "Caio Nogueira", department: "Departamento Horizonte" },
  { name: "Lina Vasconcelos", department: "Departamento Pioneiro" },
  { name: "Bento Alencar", department: "Departamento Aurora" },
  { name: "Cecília Prado", department: "Departamento Aurora" },
  { name: "Davi Monteiro", department: "Departamento Horizonte" },
  { name: "Eva Saldanha", department: "Departamento Horizonte" },
  { name: "Fábio Teles", department: "Departamento Pioneiro" },
  { name: "Gilda Amaral", department: "Departamento Pioneiro" },
  { name: "Heitor Campos", department: "Departamento Aurora" },
];

const seedDisciplines = [
  { code: "CMP101", name: "Fundamentos de Programação", department: "Departamento Aurora", workloadHours: 64 },
  { code: "CMP102", name: "Estruturas de Dados", department: "Departamento Aurora", workloadHours: 64 },
  { code: "CMP201", name: "Programação para Web", department: "Departamento Aurora", workloadHours: 64 },
  { code: "CMP202", name: "Engenharia de Software", department: "Departamento Aurora", workloadHours: 64 },
  { code: "CMP203", name: "Bancos de Dados", department: "Departamento Aurora", workloadHours: 64 },
  { code: "SDG101", name: "Lógica Digital", department: "Departamento Horizonte", workloadHours: 64 },
  { code: "SDG102", name: "Arquitetura de Computadores", department: "Departamento Horizonte", workloadHours: 64 },
  { code: "SDG201", name: "Sistemas Embarcados", department: "Departamento Horizonte", workloadHours: 64 },
  { code: "SDG202", name: "Redes de Computadores", department: "Departamento Horizonte", workloadHours: 64 },
  { code: "SDG203", name: "Laboratório de Circuitos", department: "Departamento Horizonte", workloadHours: 32 },
  { code: "CDD101", name: "Matemática para Dados", department: "Departamento Pioneiro", workloadHours: 64 },
  { code: "CDD102", name: "Estatística Aplicada", department: "Departamento Pioneiro", workloadHours: 64 },
  { code: "CDD201", name: "Aprendizado de Máquina", department: "Departamento Pioneiro", workloadHours: 64 },
  { code: "CDD202", name: "Visualização de Dados", department: "Departamento Pioneiro", workloadHours: 48 },
  { code: "CDD203", name: "Ética e Qualidade de Dados", department: "Departamento Pioneiro", workloadHours: 32 },
];

const seedCourseDisciplines = [
  { course: "Computação Aplicada", disciplines: ["CMP101", "CMP102", "CMP201", "CMP202", "CMP203", "SDG202", "CDD101"] },
  { course: "Sistemas Digitais", disciplines: ["CMP101", "CMP102", "SDG101", "SDG102", "SDG201", "SDG202", "SDG203"] },
  { course: "Ciência de Dados", disciplines: ["CMP101", "CMP102", "CMP203", "CDD101", "CDD102", "CDD201", "CDD202", "CDD203"] },
];

const seedProfessorDisciplines = [
  { professor: "Ada Ribeiro", disciplines: ["CMP101", "CMP102"] },
  { professor: "Caio Nogueira", disciplines: ["SDG101", "SDG102"] },
  { professor: "Lina Vasconcelos", disciplines: ["CDD101", "CDD102"] },
  { professor: "Bento Alencar", disciplines: ["CMP201", "CMP202"] },
  { professor: "Cecília Prado", disciplines: ["CMP203", "CMP102"] },
  { professor: "Davi Monteiro", disciplines: ["SDG201", "SDG203"] },
  { professor: "Eva Saldanha", disciplines: ["SDG202", "SDG102"] },
  { professor: "Fábio Teles", disciplines: ["CDD201", "CDD102"] },
  { professor: "Gilda Amaral", disciplines: ["CDD202", "CDD203"] },
  { professor: "Heitor Campos", disciplines: ["CMP101", "CMP202"] },
];

const seedReviews = [
  { targetType: "professor" as const, professorName: "Ada Ribeiro", ratings: { didactics: 5, clarity: 5, punctuality: 5, availability: 5 }, status: "published" as const, comment: "Explicações claras e atividades bem organizadas." },
  { targetType: "professor" as const, professorName: "Ada Ribeiro", ratings: { didactics: 4, clarity: 4, punctuality: 4, availability: 4 }, status: "published" as const, comment: "Feedbacks úteis durante os exercícios." },
  { targetType: "professor" as const, professorName: "Caio Nogueira", ratings: { didactics: 4, clarity: 4, punctuality: 4, availability: 4 }, status: "published" as const, comment: "Aulas objetivas e exemplos práticos." },
  { targetType: "discipline" as const, disciplineCode: "CMP101", ratings: { difficulty: 3, relevance: 5, workload: 4 }, status: "published" as const, comment: "Conteúdo introdutório bem distribuído ao longo das atividades." },
  { targetType: "discipline" as const, disciplineCode: "CMP101", ratings: { difficulty: 4, relevance: 4, workload: 3 }, status: "published" as const, comment: "Exercícios fictícios ajudam a consolidar os fundamentos." },
  { targetType: "discipline" as const, disciplineCode: "CDD101", ratings: { difficulty: 4, relevance: 5, workload: 4 }, status: "published" as const, comment: "Base matemática relevante para os módulos seguintes." },
];

const seedUsers = [
  {
    name: "Ana Exemplo",
    email: "ana@student.profrate.test",
    password: "ProfRate#2026Aluno",
    role: "student" as const,
    course: "Computação Aplicada",
  },
  {
    name: "Mauro Moderador",
    email: "moderador@profrate.test",
    password: "ProfRate#2026Moderador",
    role: "moderator" as const,
    course: null,
  },
];

function requiredId(map: Map<string, number>, key: string, entity: string) {
  const id = map.get(key);

  if (id === undefined) {
    throw new Error(`Seed ${entity} not found: ${key}`);
  }

  return id;
}

try {
  await db.transaction(async (transaction) => {
    await transaction
      .insert(departments)
      .values(seedDepartments.map((name) => ({ name })))
      .onConflictDoNothing({ target: departments.name });

    const departmentRows = await transaction
      .select({ id: departments.id, name: departments.name })
      .from(departments);
    const departmentIds = new Map(departmentRows.map(({ id, name }) => [name, id]));

    for (const course of seedCourses) {
      const departmentId = requiredId(departmentIds, course.department, "department");
      const existingCourse = await transaction
        .select({ id: courses.id })
        .from(courses)
        .where(and(eq(courses.name, course.name), eq(courses.departmentId, departmentId)))
        .limit(1);

      if (existingCourse.length === 0) {
        await transaction.insert(courses).values({ name: course.name, departmentId });
      }
    }

    const existingProfessors = await transaction
      .select({ id: professors.id, name: professors.name })
      .from(professors);
    const professorIds = new Map(existingProfessors.map(({ id, name }) => [name, id]));

    for (const professor of seedProfessors) {
      const departmentId = requiredId(departmentIds, professor.department, "department");
      const professorId = professorIds.get(professor.name);

      if (professorId === undefined) {
        const [insertedProfessor] = await transaction
          .insert(professors)
          .values({ name: professor.name, departmentId })
          .returning({ id: professors.id });
        professorIds.set(professor.name, insertedProfessor.id);
      } else {
        await transaction
          .update(professors)
          .set({ departmentId })
          .where(eq(professors.id, professorId));
      }
    }

    for (const discipline of seedDisciplines) {
      const departmentId = requiredId(departmentIds, discipline.department, "department");
      await transaction
        .insert(disciplines)
        .values({ code: discipline.code, name: discipline.name, departmentId, workloadHours: discipline.workloadHours })
        .onConflictDoUpdate({
          target: disciplines.code,
          set: { name: discipline.name, departmentId, workloadHours: discipline.workloadHours },
        });
    }

    const courseRows = await transaction.select({ id: courses.id, name: courses.name }).from(courses);
    const courseIds = new Map(courseRows.map(({ id, name }) => [name, id]));
    const disciplineRows = await transaction.select({ id: disciplines.id, code: disciplines.code }).from(disciplines);
    const disciplineIds = new Map(disciplineRows.map(({ id, code }) => [code, id]));

    const courseRelations = seedCourseDisciplines.flatMap(({ course, disciplines: codes }) =>
      codes.map((code) => ({
        courseId: requiredId(courseIds, course, "course"),
        disciplineId: requiredId(disciplineIds, code, "discipline"),
      })),
    );
    await transaction.insert(courseDisciplines).values(courseRelations).onConflictDoNothing();

    const professorRelations = seedProfessorDisciplines.flatMap(({ professor, disciplines: codes }) =>
      codes.map((code) => ({
        professorId: requiredId(professorIds, professor, "professor"),
        disciplineId: requiredId(disciplineIds, code, "discipline"),
      })),
    );
    await transaction.insert(professorDisciplines).values(professorRelations).onConflictDoNothing();

    for (const user of seedUsers) {
      const existingUser = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1);

      if (existingUser.length === 0) {
        const passwordHash = await passwordService.hashPassword(user.password);
        await transaction.insert(users).values({
          name: user.name,
          email: user.email,
          passwordHash,
          role: user.role,
          courseId: user.course === null
            ? null
            : requiredId(courseIds, user.course, "course"),
        });
      }
    }

    const existingReviews = await transaction
      .select({ professorId: reviews.professorId, disciplineId: reviews.disciplineId, comment: reviews.comment })
      .from(reviews)
      .where(isNull(reviews.authorId));
    const existingReviewKeys = new Set(
      existingReviews.map(({ professorId, disciplineId, comment }) => `${professorId ?? `d${disciplineId}`}:${comment}`),
    );

    for (const review of seedReviews) {
      const targetId = review.targetType === "professor"
        ? requiredId(professorIds, review.professorName, "professor")
        : requiredId(disciplineIds, review.disciplineCode, "discipline");
      const reviewKey = `${review.targetType === "professor" ? targetId : `d${targetId}`}:${review.comment}`;

      if (!existingReviewKeys.has(reviewKey)) {
        await transaction.insert(reviews).values(review.targetType === "professor"
          ? { professorId: targetId, ...review.ratings, status: review.status, comment: review.comment }
          : { disciplineId: targetId, ...review.ratings, status: review.status, comment: review.comment });
        existingReviewKeys.add(reviewKey);
      }
    }

    const [seedStudent] = await transaction
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "ana@student.profrate.test"))
      .limit(1);
    const adaProfessorId = requiredId(professorIds, "Ada Ribeiro", "professor");
    const pendingComment = "Avaliação fictícia aguardando moderação.";
    const pendingReview = await transaction
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.authorId, seedStudent!.id), eq(reviews.comment, pendingComment)))
      .limit(1);
    if (pendingReview.length === 0) {
      await transaction.insert(reviews).values({
        professorId: adaProfessorId,
        authorId: seedStudent!.id,
        didactics: 4,
        clarity: 4,
        punctuality: 5,
        availability: 4,
        status: "pending",
        comment: pendingComment,
      });
    }

    const [publishedReview] = await transaction
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.comment, "Explicações claras e atividades bem organizadas."))
      .limit(1);
    const existingReport = await transaction
      .select({ id: reports.id })
      .from(reports)
      .where(and(eq(reports.reviewId, publishedReview!.id), eq(reports.reporterId, seedStudent!.id)))
      .limit(1);
    if (existingReport.length === 0) {
      await transaction.insert(reports).values({
        reviewId: publishedReview!.id,
        reporterId: seedStudent!.id,
        reason: "Denúncia fictícia pendente para demonstração local.",
      });
    }
  });

  console.log("Academic catalog seed completed.");
} catch (error) {
  console.error("Database seed failed.", error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
