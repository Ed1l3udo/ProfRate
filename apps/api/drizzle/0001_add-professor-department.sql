ALTER TABLE "professors" ADD COLUMN "department" text;
--> statement-breakpoint
UPDATE "professors"
SET "department" = 'Departamento não informado'
WHERE "department" IS NULL;
--> statement-breakpoint
ALTER TABLE "professors" ALTER COLUMN "department" SET NOT NULL;
