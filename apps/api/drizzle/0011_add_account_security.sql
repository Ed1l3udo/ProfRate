CREATE TABLE "password_reset_tokens" (
  "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" ("user_id");
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens" ("expires_at");
--> statement-breakpoint
CREATE TABLE "login_attempts" (
  "email" text PRIMARY KEY,
  "failed_count" integer DEFAULT 0 NOT NULL,
  "window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "locked_until" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_logs" (
  "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "moderator_id" integer REFERENCES "users"("id") ON DELETE set null,
  "action" text NOT NULL,
  "target_type" text NOT NULL,
  "target_id" integer NOT NULL,
  "metadata" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "moderation_logs_created_at_idx" ON "moderation_logs" ("created_at");
CREATE INDEX "moderation_logs_action_idx" ON "moderation_logs" ("action");
CREATE INDEX "moderation_logs_target_idx" ON "moderation_logs" ("target_type", "target_id");
--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT "reports_reporter_id_users_id_fk";
ALTER TABLE "reports" ALTER COLUMN "reporter_id" DROP NOT NULL;
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE set null;
