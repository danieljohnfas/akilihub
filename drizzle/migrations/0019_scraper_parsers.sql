-- NOTE: 0015_employer_url.sql was never registered in the drizzle journal; it is folded in below.
-- NOTE: "professions" already exists in some environments (it was created outside drizzle);
-- IF NOT EXISTS keeps this migration safe to apply everywhere.
CREATE TABLE IF NOT EXISTS "professions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"automation_risk_score" numeric(4, 2),
	"resilience_rationale" text,
	"upskilling_advice" text,
	"founder_opportunity" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "professions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scraper_parsers" (
	"hash" text PRIMARY KEY NOT NULL,
	"spec" jsonb NOT NULL,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
-- Folded in from the previously un-journaled 0015_employer_url.sql so that
-- `drizzle-kit migrate` on a fresh database creates these columns/indexes too.
-- All statements are idempotent (IF NOT EXISTS).

--> statement-breakpoint
ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "employer_url" text,
  ADD COLUMN IF NOT EXISTS "is_aggregator_source" boolean NOT NULL DEFAULT false;

--> statement-breakpoint
ALTER TABLE "tenders"
  ADD COLUMN IF NOT EXISTS "employer_url" text,
  ADD COLUMN IF NOT EXISTS "is_aggregator_source" boolean NOT NULL DEFAULT false;

--> statement-breakpoint
ALTER TABLE "compliance_requirements"
  ADD COLUMN IF NOT EXISTS "employer_url" text,
  ADD COLUMN IF NOT EXISTS "is_aggregator_source" boolean NOT NULL DEFAULT false;

--> statement-breakpoint
-- Index for efficient querying of unresolved records (backfill job)
CREATE INDEX IF NOT EXISTS "jobs_employer_url_idx" ON "jobs" ("employer_url");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenders_employer_url_idx" ON "tenders" ("employer_url");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compliance_employer_url_idx" ON "compliance_requirements" ("employer_url");
--> statement-breakpoint
-- Index for aggregator source flag (admin panel stats queries)
CREATE INDEX IF NOT EXISTS "jobs_aggregator_source_idx" ON "jobs" ("is_aggregator_source");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenders_aggregator_source_idx" ON "tenders" ("is_aggregator_source");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compliance_aggregator_source_idx" ON "compliance_requirements" ("is_aggregator_source");
