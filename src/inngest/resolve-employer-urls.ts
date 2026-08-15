import { inngest } from "./client";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema/jobs";
import { tenders } from "@/lib/db/schema/tenders";
import { complianceRequirements } from "@/lib/db/schema/compliance";
import { eq, isNull, and } from "drizzle-orm";
import { resolveEmployerUrl, classifySourceUrl } from "@/lib/sources/employer-resolver";
import { executeWithRetry, chunkArray } from "@/lib/db/query-resilience";

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE DISPATCHER (Cron Job)
// ─────────────────────────────────────────────────────────────────────────────
export const resolveEmployerUrlsJob = inngest.createFunction(
  {
    id: "resolve-employer-urls-dispatcher",
    name: "🏢 Resolve Employer URLs (Dispatcher)",
    triggers: [{ cron: "30 12 * * *" }, { event: "manual.data.review" }], // 12:30 UTC daily or manual trigger
  },
  async ({ step }) => {
    
    // JOBS
    const jobsResult = await step.run("dispatch-jobs", async () => {
      const pending = await executeWithRetry(() => db
        .select({ id: jobs.id, sourceUrl: jobs.sourceUrl, title: jobs.title, companyName: jobs.companyName })
        .from(jobs)
        .where(and(eq(jobs.isActive, true), isNull(jobs.employerUrl)))
      );

      let fastResolved = 0;
      const slowEvents = [];

      for (const job of pending) {
        const { isAggregatorSource, quickEmployerUrl } = classifySourceUrl(job.sourceUrl);
        if (!isAggregatorSource && quickEmployerUrl) {
          await db.update(jobs).set({ employerUrl: quickEmployerUrl, isAggregatorSource: false, updatedAt: new Date() }).where(eq(jobs.id, job.id));
          fastResolved++;
        } else {
          slowEvents.push({
            name: "data.url.resolve",
            data: { id: job.id, module: 'jobs', sourceUrl: job.sourceUrl, title: job.title, companyName: job.companyName }
          });
        }
      }
      return { total: pending.length, fastResolved, slowEvents };
    });

    // TENDERS
    const tendersResult = await step.run("dispatch-tenders", async () => {
      const pending = await executeWithRetry(() => db
        .select({ id: tenders.id, sourceUrl: tenders.sourceUrl, title: tenders.title, contractingAuthority: tenders.contractingAuthority })
        .from(tenders)
        .where(isNull(tenders.employerUrl))
      );

      let fastResolved = 0;
      const slowEvents = [];

      for (const tender of pending) {
        const { isAggregatorSource, quickEmployerUrl } = classifySourceUrl(tender.sourceUrl);
        if (!isAggregatorSource && quickEmployerUrl) {
          await db.update(tenders).set({ employerUrl: quickEmployerUrl, isAggregatorSource: false, updatedAt: new Date() }).where(eq(tenders.id, tender.id));
          fastResolved++;
        } else {
          slowEvents.push({
            name: "data.url.resolve",
            data: { id: tender.id, module: 'tenders', sourceUrl: tender.sourceUrl, title: tender.title, companyName: tender.contractingAuthority }
          });
        }
      }
      return { total: pending.length, fastResolved, slowEvents };
    });

    // COMPLIANCE
    const complianceResult = await step.run("dispatch-compliance", async () => {
      const pending = await executeWithRetry(() => db
        .select({ id: complianceRequirements.id, sourceUrl: complianceRequirements.sourceUrl, title: complianceRequirements.title, issuingAuthority: complianceRequirements.issuingAuthority })
        .from(complianceRequirements)
        .where(and(eq(complianceRequirements.isActive, true), isNull(complianceRequirements.employerUrl)))
      );

      const withUrl = pending.filter(r => !!r.sourceUrl);
      let fastResolved = 0;
      const slowEvents = [];

      for (const record of withUrl) {
        const { isAggregatorSource, quickEmployerUrl } = classifySourceUrl(record.sourceUrl!);
        if (!isAggregatorSource && quickEmployerUrl) {
          await db.update(complianceRequirements).set({ employerUrl: quickEmployerUrl, isAggregatorSource: false, updatedAt: new Date() }).where(eq(complianceRequirements.id, record.id));
          fastResolved++;
        } else {
          slowEvents.push({
            name: "data.url.resolve",
            data: { id: record.id, module: 'compliance', sourceUrl: record.sourceUrl!, title: record.title, companyName: record.issuingAuthority }
          });
        }
      }
      return { total: withUrl.length, fastResolved, slowEvents };
    });

    const allEvents = [...jobsResult.slowEvents, ...tendersResult.slowEvents, ...complianceResult.slowEvents];
    
    // Dispatch all slow events in chunks of 500
    if (allEvents.length > 0) {
      for (const [i, chunk] of chunkArray(allEvents, 500).entries()) {
        await step.sendEvent(`dispatch-url-resolve-batch-${i}`, chunk);
      }
    }

    return { 
      jobs: { fast: jobsResult.fastResolved, dispatched: jobsResult.slowEvents.length },
      tenders: { fast: tendersResult.fastResolved, dispatched: tendersResult.slowEvents.length },
      compliance: { fast: complianceResult.fastResolved, dispatched: complianceResult.slowEvents.length }
    };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE WORKER (Event Listener)
// ─────────────────────────────────────────────────────────────────────────────
export const resolveUrlWorker = inngest.createFunction(
  { id: "resolve-url-worker", name: "Worker: Resolve URL", concurrency: 5, triggers: [{ event: "data.url.resolve" }] }, // strict concurrency to avoid aggregator bans
  async ({ event, step }) => {
    const { id, module, sourceUrl, title, companyName } = event.data;

    const result = await step.run("fetch-and-resolve", () => resolveEmployerUrl(sourceUrl, { title, company: companyName }));

    await step.run("update-db", async () => {
      const payload = { employerUrl: result.employerUrl, isAggregatorSource: result.isAggregator, updatedAt: new Date() };

      if (module === 'jobs') {
        await executeWithRetry(() => db.update(jobs).set(payload).where(eq(jobs.id, id)));
      } else if (module === 'tenders') {
        await executeWithRetry(() => db.update(tenders).set(payload).where(eq(tenders.id, id)));
      } else if (module === 'compliance') {
        await executeWithRetry(() => db.update(complianceRequirements).set(payload).where(eq(complianceRequirements.id, id)));
      }
    });

    return { resolved: !!result.employerUrl };
  }
);
