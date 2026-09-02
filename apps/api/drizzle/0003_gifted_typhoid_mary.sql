ALTER TABLE "reviews" ADD COLUMN "created_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "updated_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "reviews"
SET "created_at" = now(), "updated_at" = now()
WHERE "created_at" IS NULL OR "updated_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "created_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "updated_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "created_at" SET DEFAULT now();
--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "updated_at" SET DEFAULT now();
