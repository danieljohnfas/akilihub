ALTER TABLE "job_applications" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN "session_id" text;