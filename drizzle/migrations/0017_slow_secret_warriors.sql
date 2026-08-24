CREATE TABLE "data_verification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_id" uuid NOT NULL,
	"source_module" text NOT NULL,
	"target_module" text NOT NULL,
	"action_taken" text NOT NULL,
	"verified_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_config" ADD COLUMN "role" text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "sector" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "profession" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "experience_level" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "education_level" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "skills" text[];--> statement-breakpoint
ALTER TABLE "tenders" ADD COLUMN "ai_summary" text;