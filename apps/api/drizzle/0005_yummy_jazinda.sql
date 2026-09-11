CREATE TABLE "course_disciplines" (
	"course_id" integer NOT NULL,
	"discipline_id" integer NOT NULL,
	CONSTRAINT "course_disciplines_course_id_discipline_id_pk" PRIMARY KEY("course_id","discipline_id")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "courses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"department_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "departments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "disciplines" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "disciplines_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name" text NOT NULL,
	"department_id" integer NOT NULL,
	"workload_hours" integer NOT NULL,
	CONSTRAINT "disciplines_code_unique" UNIQUE("code"),
	CONSTRAINT "disciplines_workload_hours_positive" CHECK ("disciplines"."workload_hours" > 0)
);
--> statement-breakpoint
CREATE TABLE "professor_disciplines" (
	"professor_id" integer NOT NULL,
	"discipline_id" integer NOT NULL,
	CONSTRAINT "professor_disciplines_professor_id_discipline_id_pk" PRIMARY KEY("professor_id","discipline_id")
);
--> statement-breakpoint
ALTER TABLE "professors" ADD COLUMN "department_id" integer;--> statement-breakpoint
INSERT INTO "departments" ("name")
SELECT DISTINCT "department"
FROM "professors"
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
UPDATE "professors"
SET "department_id" = "departments"."id"
FROM "departments"
WHERE "professors"."department" = "departments"."name";--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "professors" WHERE "department_id" IS NULL) THEN
		RAISE EXCEPTION 'Could not backfill professors.department_id';
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "professors" ALTER COLUMN "department_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "course_disciplines" ADD CONSTRAINT "course_disciplines_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_disciplines" ADD CONSTRAINT "course_disciplines_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disciplines" ADD CONSTRAINT "disciplines_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professor_disciplines" ADD CONSTRAINT "professor_disciplines_professor_id_professors_id_fk" FOREIGN KEY ("professor_id") REFERENCES "public"."professors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professor_disciplines" ADD CONSTRAINT "professor_disciplines_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_disciplines_discipline_id_idx" ON "course_disciplines" USING btree ("discipline_id");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_name_department_id_unique" ON "courses" USING btree ("name","department_id");--> statement-breakpoint
CREATE INDEX "courses_department_id_idx" ON "courses" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "disciplines_department_id_idx" ON "disciplines" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "professor_disciplines_discipline_id_idx" ON "professor_disciplines" USING btree ("discipline_id");--> statement-breakpoint
ALTER TABLE "professors" ADD CONSTRAINT "professors_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "professors_department_id_idx" ON "professors" USING btree ("department_id");--> statement-breakpoint
ALTER TABLE "professors" DROP COLUMN "department";
