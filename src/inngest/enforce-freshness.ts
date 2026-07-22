import { inngest } from "./client";
import { db } from "@/lib/db/client";
import { tenders } from "@/lib/db/schema/tenders";
import { jobs } from "@/lib/db/schema/jobs";
import { healthDataPoints } from "@/lib/db/schema/health";
import { lt, and, eq, sql } from "drizzle-orm";

/**
 * DATA FRESHNESS ENFORCEMENT
 *
 * Rules:
 *  1. TENDERS: Any tender whose deadline has passed is automatically
 *     marked "closed". No expired tenders should ever be shown as "open".
 *
 *  2. JOBS: Any job whose deadline has passed is automatically
 *     marked "inactive".
 *
 *  3. HEALTH DATA: Only the last 5 years of data is kept per indicator
 *     per country. Older records are pruned to prevent stale stats
 *     appearing on the dashboard.
 *
 * This job runs twice a day (06:00 and 18:00 UTC) to keep data current.
 */
export const enforceDataFreshnessJob = inngest.createFunction(
  {
    id: "enforce-data-freshness",
    name: "🧹 Enforce Data Freshness",
    triggers: [
      { cron: "0 6 * * *" },   // 06:00 UTC daily
      { cron: "0 18 * * *" },  // 18:00 UTC daily
    ],
  },
  async ({ step }) => {
    // ── Step 1: Close expired tenders ──────────────────────────────────────
    const expiredTendersResult = await step.run("close-expired-tenders", async () => {
      const now = new Date();

      const updated = await db
        .update(tenders)
        .set({
          status: "closed",
          updatedAt: now,
        })
        .where(
          and(
            eq(tenders.status, "open"),
            lt(tenders.deadline, now)
          )
        )
        .returning({ id: tenders.id });

      console.log(`[Freshness] Closed ${updated.length} expired tenders.`);
      return { closedTendersCount: updated.length };
    });

    // ── Step 2: Close expired jobs ─────────────────────────────────────────
    const expiredJobsResult = await step.run("close-expired-jobs", async () => {
      const now = new Date();

      const updated = await db
        .update(jobs)
        .set({
          isActive: false,
          updatedAt: now,
        })
        .where(
          and(
            eq(jobs.isActive, true),
            lt(jobs.deadline, now)
          )
        )
        .returning({ id: jobs.id });

      console.log(`[Freshness] Closed ${updated.length} expired jobs.`);
      return { closedJobsCount: updated.length };
    });

    // ── Step 3: Prune health data older than 5 years ───────────────────────
    const healthResult = await step.run("prune-stale-health-data", async () => {
      const cutoffYear = new Date().getFullYear() - 5;

      const deleted = await db
        .delete(healthDataPoints)
        .where(lt(healthDataPoints.year, cutoffYear))
        .returning({ id: healthDataPoints.id });

      console.log(`[Freshness] Pruned ${deleted.length} health data points older than year ${cutoffYear}.`);
      return { deletedCount: deleted.length };
    });

    // ── Step 4: Flag tenders that haven't been refreshed in 7 days ─────────
    const staleResult = await step.run("flag-stale-tenders", async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Count how many open tenders are potentially stale (not updated in 7 days)
      const staleCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(tenders)
        .where(
          and(
            eq(tenders.status, "open"),
            lt(tenders.updatedAt, sevenDaysAgo)
          )
        );

      const count = Number(staleCount[0]?.count ?? 0);
      if (count > 0) {
        console.warn(`[Freshness] ⚠️  ${count} open tenders have not been refreshed in 7+ days. Scrapers may need attention.`);
      }

      return { staleOpenTenders: count };
    });

    return {
      message: "Data freshness enforcement complete.",
      ...expiredTendersResult,
      ...expiredJobsResult,
      ...healthResult,
      ...staleResult,
    };
  }
);
