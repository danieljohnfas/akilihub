ALTER TABLE "ai_telemetry" ALTER COLUMN "cool_until" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "ai_telemetry" ALTER COLUMN "last_used" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_min" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_max" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_currency" text;