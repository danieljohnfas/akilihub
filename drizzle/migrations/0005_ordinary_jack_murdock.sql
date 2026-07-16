CREATE TABLE "ai_telemetry" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"cool_until" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"last_used" integer DEFAULT 0 NOT NULL,
	"total_calls" integer DEFAULT 0 NOT NULL,
	"total_errors" integer DEFAULT 0 NOT NULL,
	"supports_structured" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "compliance_requirements" DROP CONSTRAINT "compliance_requirements_source_url_unique";--> statement-breakpoint
CREATE INDEX "compliance_req_search_idx" ON "compliance_requirements" USING gin (to_tsvector('english', "title" || ' ' || coalesce("description", '')));--> statement-breakpoint
CREATE INDEX "jobs_search_idx" ON "jobs" USING gin (to_tsvector('english', "title" || ' ' || coalesce("description", '')));--> statement-breakpoint
CREATE INDEX "tenders_search_idx" ON "tenders" USING gin (to_tsvector('english', "title" || ' ' || coalesce("description", '')));