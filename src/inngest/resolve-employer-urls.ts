import { inngest } from "./client";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema/jobs";
import { tenders } from "@/lib/db/schema/tenders";
import { complianceRequirements } from "@/lib/db/schema/compliance";
import { eq, isNull, and } from "drizzle-orm";
import { resolveEmployerUrl, classifySourceUrl } from "@/lib/sources/employer-resolver";

/**
 * RESOLVE EMPLOYER URLS — Retroactive Backfill Job
 *
 * Purpose:
 *   Processes all existing job, tender, and compliance records that have no
 *   employer_url yet. For each record:
 *     - If sourceUrl is an ATS platform or not a known aggregator → copies it
 *       directly to employer_url (fast path, no HTTP fetch needed).
 *     - If sourceUrl is a known aggregator → fetches the aggregator page and
 *       extracts the true employer/authority URL via link scoring.
 *
 * This job is FULLY IDEMPOTENT. Records with employer_url already set are
 * skipped entirely. Re-runs are safe.
 *
 * Schedule: Daily at 12:30 UTC (after enrich-shallow-data finishes at ~12:00).
 *
 * Batch limits per run (to stay within Vercel timeout):
 *   - Jobs:       60 records
 *   - Tenders:    50 records
 *   - Compliance: 40 records
 *
 * Full backfill ETA: ~10-14 days for a database of ~2,000+ records.
 */

const BATCH_JOBS = 60;
const BATCH_TENDERS = 50;
const BATCH_COMPLIANCE = 40;
const POLITE_DELAY_MS = 800; // delay between HTTP fetches to avoid hammering aggregator servers

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const resolveEmployerUrlsJob = inngest.createFunction(
  {
    id: "resolve-employer-urls",
    name: "🏢 Resolve Employer URLs (Backfill)",
    triggers: [{ cron: "30 12 * * *" }], // 12:30 UTC daily
  },
  async ({ step }) => {

    // ══════════════════════════════════════════════════
    // STEP 1 — JOBS
    // ══════════════════════════════════════════════════
    const jobsResult = await step.run("resolve-jobs-employer-urls", async () => {
      const pending = await db
        .select({
          id: jobs.id,
          sourceUrl: jobs.sourceUrl,
          title: jobs.title,
          companyName: jobs.companyName,
        })
        .from(jobs)
        .where(
          and(
            eq(jobs.isActive, true),
            isNull(jobs.employerUrl),
          )
        )
        .limit(BATCH_JOBS);

      console.log(`[resolve-employer-urls] Jobs pending: ${pending.length}`);

      let resolved = 0;
      let flaggedAggregator = 0;
      let failed = 0;

      for (const job of pending) {
        try {
          // Fast path: classify without fetching
          const { isAggregatorSource, quickEmployerUrl } = classifySourceUrl(job.sourceUrl);

          if (!isAggregatorSource && quickEmployerUrl) {
            // Not an aggregator — sourceUrl IS the employer URL
            await db.update(jobs)
              .set({ employerUrl: quickEmployerUrl, isAggregatorSource: false, updatedAt: new Date() })
              .where(eq(jobs.id, job.id));
            resolved++;
            continue;
          }

          // Slow path: fetch aggregator page / search for true employer URL
          flaggedAggregator++;
          const result = await resolveEmployerUrl(job.sourceUrl, {
            title: job.title,
            company: job.companyName,
          });
          await db.update(jobs)
            .set({
              employerUrl: result.employerUrl, // may be null if resolution failed
              isAggregatorSource: result.isAggregator,
              updatedAt: new Date(),
            })
            .where(eq(jobs.id, job.id));

          if (result.employerUrl) resolved++;
          await sleep(POLITE_DELAY_MS);

        } catch (err) {
          console.error(`[resolve-employer-urls] Job ${job.id} failed:`, (err as Error).message);
          failed++;
        }
      }

      console.log(`[resolve-employer-urls] Jobs done. Resolved: ${resolved}, Aggregators: ${flaggedAggregator}, Failed: ${failed}`);
      return { total: pending.length, resolved, flaggedAggregator, failed };
    });

    // ══════════════════════════════════════════════════
    // STEP 2 — TENDERS
    // ══════════════════════════════════════════════════
    const tendersResult = await step.run("resolve-tenders-employer-urls", async () => {
      const pending = await db
        .select({
          id: tenders.id,
          sourceUrl: tenders.sourceUrl,
          title: tenders.title,
          contractingAuthority: tenders.contractingAuthority,
        })
        .from(tenders)
        .where(isNull(tenders.employerUrl))
        .limit(BATCH_TENDERS);

      console.log(`[resolve-employer-urls] Tenders pending: ${pending.length}`);

      let resolved = 0;
      let flaggedAggregator = 0;
      let failed = 0;

      for (const tender of pending) {
        try {
          const { isAggregatorSource, quickEmployerUrl } = classifySourceUrl(tender.sourceUrl);

          if (!isAggregatorSource && quickEmployerUrl) {
            await db.update(tenders)
              .set({ employerUrl: quickEmployerUrl, isAggregatorSource: false, updatedAt: new Date() })
              .where(eq(tenders.id, tender.id));
            resolved++;
            continue;
          }

          flaggedAggregator++;
          const result = await resolveEmployerUrl(tender.sourceUrl, {
            title: tender.title,
            company: tender.contractingAuthority,
          });
          await db.update(tenders)
            .set({
              employerUrl: result.employerUrl,
              isAggregatorSource: result.isAggregator,
              updatedAt: new Date(),
            })
            .where(eq(tenders.id, tender.id));

          if (result.employerUrl) resolved++;
          await sleep(POLITE_DELAY_MS);

        } catch (err) {
          console.error(`[resolve-employer-urls] Tender ${tender.id} failed:`, (err as Error).message);
          failed++;
        }
      }

      console.log(`[resolve-employer-urls] Tenders done. Resolved: ${resolved}, Aggregators: ${flaggedAggregator}, Failed: ${failed}`);
      return { total: pending.length, resolved, flaggedAggregator, failed };
    });

    // ══════════════════════════════════════════════════
    // STEP 3 — COMPLIANCE
    // ══════════════════════════════════════════════════
    const complianceResult = await step.run("resolve-compliance-employer-urls", async () => {
      const pending = await db
        .select({ id: complianceRequirements.id, sourceUrl: complianceRequirements.sourceUrl })
        .from(complianceRequirements)
        .where(
          and(
            eq(complianceRequirements.isActive, true),
            isNull(complianceRequirements.employerUrl),
          )
        )
        .limit(BATCH_COMPLIANCE);

      // Filter to records that actually have a sourceUrl
      const withUrl = pending.filter(r => !!r.sourceUrl);
      console.log(`[resolve-employer-urls] Compliance pending (with URL): ${withUrl.length}`);

      let resolved = 0;
      let flaggedAggregator = 0;
      let failed = 0;

      for (const record of withUrl) {
        try {
          const sourceUrl = record.sourceUrl!;
          const { isAggregatorSource, quickEmployerUrl } = classifySourceUrl(sourceUrl);

          if (!isAggregatorSource && quickEmployerUrl) {
            await db.update(complianceRequirements)
              .set({ employerUrl: quickEmployerUrl, isAggregatorSource: false, updatedAt: new Date() })
              .where(eq(complianceRequirements.id, record.id));
            resolved++;
            continue;
          }

          flaggedAggregator++;
          const result = await resolveEmployerUrl(sourceUrl);
          await db.update(complianceRequirements)
            .set({
              employerUrl: result.employerUrl,
              isAggregatorSource: result.isAggregator,
              updatedAt: new Date(),
            })
            .where(eq(complianceRequirements.id, record.id));

          if (result.employerUrl) resolved++;
          await sleep(POLITE_DELAY_MS);

        } catch (err) {
          console.error(`[resolve-employer-urls] Compliance ${record.id} failed:`, (err as Error).message);
          failed++;
        }
      }

      console.log(`[resolve-employer-urls] Compliance done. Resolved: ${resolved}, Aggregators: ${flaggedAggregator}, Failed: ${failed}`);
      return { total: withUrl.length, resolved, flaggedAggregator, failed };
    });

    return {
      jobs: jobsResult,
      tenders: tendersResult,
      compliance: complianceResult,
    };
  }
);
