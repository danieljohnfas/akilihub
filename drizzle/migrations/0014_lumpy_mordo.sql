ALTER TABLE "salary_submissions" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_seen_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_search_query" text;