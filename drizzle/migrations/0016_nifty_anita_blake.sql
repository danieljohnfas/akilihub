ALTER TABLE "jobs" ADD COLUMN "needs_ai_extraction" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "jobs_needs_ai_idx" ON "jobs" USING btree ("needs_ai_extraction");