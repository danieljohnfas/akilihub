CREATE TYPE "public"."job_type" AS ENUM('full_time', 'part_time', 'contract', 'internship', 'remote');--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"company_name" text NOT NULL,
	"description" text NOT NULL,
	"requirements" text,
	"location" text,
	"country_id" uuid NOT NULL,
	"job_type" "job_type" DEFAULT 'full_time',
	"source_url" text NOT NULL,
	"posted_date" timestamp,
	"deadline" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_source_url_unique" UNIQUE("source_url")
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jobs_country_idx" ON "jobs" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "jobs_deadline_idx" ON "jobs" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX "jobs_active_idx" ON "jobs" USING btree ("is_active");