-- Migration: employer_url columns on jobs, tenders, compliance_requirements
-- Adds two columns to each table:
--   employer_url: the resolved direct employer/authority URL (nullable)
--   is_aggregator_source: flag indicating sourceUrl points to an aggregator

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
