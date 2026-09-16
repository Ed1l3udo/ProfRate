CREATE TABLE "favorite_professors" (
	"user_id" integer NOT NULL,
	"professor_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorite_professors_user_id_professor_id_pk" PRIMARY KEY("user_id","professor_id")
);
--> statement-breakpoint
CREATE TABLE "favorite_disciplines" (
	"user_id" integer NOT NULL,
	"discipline_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorite_disciplines_user_id_discipline_id_pk" PRIMARY KEY("user_id","discipline_id")
);
--> statement-breakpoint
CREATE TABLE "helpful_reviews" (
	"user_id" integer NOT NULL,
	"review_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "helpful_reviews_user_id_review_id_pk" PRIMARY KEY("user_id","review_id")
);
--> statement-breakpoint
ALTER TABLE "favorite_professors" ADD CONSTRAINT "favorite_professors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
ALTER TABLE "favorite_professors" ADD CONSTRAINT "favorite_professors_professor_id_professors_id_fk" FOREIGN KEY ("professor_id") REFERENCES "public"."professors"("id") ON DELETE cascade;
ALTER TABLE "favorite_disciplines" ADD CONSTRAINT "favorite_disciplines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
ALTER TABLE "favorite_disciplines" ADD CONSTRAINT "favorite_disciplines_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE cascade;
ALTER TABLE "helpful_reviews" ADD CONSTRAINT "helpful_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
ALTER TABLE "helpful_reviews" ADD CONSTRAINT "helpful_reviews_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade;
CREATE INDEX "favorite_professors_professor_id_idx" ON "favorite_professors" USING btree ("professor_id");
CREATE INDEX "favorite_disciplines_discipline_id_idx" ON "favorite_disciplines" USING btree ("discipline_id");
CREATE INDEX "helpful_reviews_review_id_idx" ON "helpful_reviews" USING btree ("review_id");
