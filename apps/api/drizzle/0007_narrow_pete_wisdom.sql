ALTER TABLE "reviews" DROP CONSTRAINT "reviews_rating_between_1_and_5";--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "discipline_id" integer;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "didactics" integer;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "clarity" integer;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "punctuality" integer;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "availability" integer;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "difficulty" integer;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "relevance" integer;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "workload" integer;--> statement-breakpoint
UPDATE "reviews"
SET
	"didactics" = "rating",
	"clarity" = "rating",
	"punctuality" = "rating",
	"availability" = "rating"
WHERE "professor_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" DROP COLUMN "rating";--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "rating" double precision GENERATED ALWAYS AS (case
        when "professor_id" is not null then
          ("didactics" + "clarity" + "punctuality" + "availability") / 4.0
        else
          ("difficulty" + "relevance" + "workload") / 3.0
      end) STORED NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "professor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reviews_professor_id_idx" ON "reviews" USING btree ("professor_id");--> statement-breakpoint
CREATE INDEX "reviews_discipline_id_idx" ON "reviews" USING btree ("discipline_id");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_exactly_one_target" CHECK (("reviews"."professor_id" is not null) <> ("reviews"."discipline_id" is not null));--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_professor_ratings_shape" CHECK ("reviews"."professor_id" is null or (
        "reviews"."didactics" is not null and
        "reviews"."clarity" is not null and
        "reviews"."punctuality" is not null and
        "reviews"."availability" is not null and
        "reviews"."difficulty" is null and
        "reviews"."relevance" is null and
        "reviews"."workload" is null
      ));--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_discipline_ratings_shape" CHECK ("reviews"."discipline_id" is null or (
        "reviews"."difficulty" is not null and
        "reviews"."relevance" is not null and
        "reviews"."workload" is not null and
        "reviews"."didactics" is null and
        "reviews"."clarity" is null and
        "reviews"."punctuality" is null and
        "reviews"."availability" is null
      ));--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_ratings_between_1_and_5" CHECK (("reviews"."didactics" is null or "reviews"."didactics" between 1 and 5) and
        ("reviews"."clarity" is null or "reviews"."clarity" between 1 and 5) and
        ("reviews"."punctuality" is null or "reviews"."punctuality" between 1 and 5) and
        ("reviews"."availability" is null or "reviews"."availability" between 1 and 5) and
        ("reviews"."difficulty" is null or "reviews"."difficulty" between 1 and 5) and
        ("reviews"."relevance" is null or "reviews"."relevance" between 1 and 5) and
        ("reviews"."workload" is null or "reviews"."workload" between 1 and 5));
