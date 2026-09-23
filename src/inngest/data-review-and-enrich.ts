import { inngest } from "./client";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema/jobs";
import { tenders } from "@/lib/db/schema/tenders";
import { complianceRequirements } from "@/lib/db/schema/compliance";
import { eq, and, or, isNull, sql } from "drizzle-orm";
import { executeWithRetry, chunkArray } from "@/lib/db/query-resilience";
import {
  reviewAndEnrichJob,
  reviewRecordWithJev,
  fetchPageHtml,
  extractCleanJobFields,
  extractDirectEmployerLinks,
  extractCompanyFromTitleOrText,
} from "@/lib/services/database-data-reviewer";
import {
  extractStructuredRequirements,
  extractDeadlineFromText,
  extractSalaryFromText,
  isLegitimateEmployerUrl,
} from "@/lib/scrapers/deterministic-extractor";
import { isAggregatorUrl, isAtsPlatform, isEmployerUrl } from "@/lib/sources/aggregators";
import { safeQuery } from "@/lib/db/client";

const REVIEW_BATCH_SIZE = 200; // Records per dispatcher run

// ─────────────────────────────────────────────────────────────────────────────
// 1. DISPATCHER — Queues batches of records needing review
// ─────────────────────────────────────────────────────────────────────────────
export const dataReviewDispatcherJob = inngest.createFunction(
  {
    id: "data-review-enrichment-dispatcher",
    name: "🔍 Jev Data Review & Enrichment (Dispatcher)",
    triggers: [
      { cron: "0 14 * * *" }, // 14:00 UTC daily, after enrichment + URL resolver
      { event: "data.review.start" }, // Manual trigger
    ],
    concurrency: { limit: 1 },
  },
  async ({ step, event }) => {
    const module: string = (event.data as any)?.module || "all";

    const dispatchedEvents: any[] = [];

    // ── JOBS ──
    if (module === "all" || module === "jobs") {
      const pendingJobs = await step.run("fetch-candidate-jobs", async () => {
        return await executeWithRetry(() =>
          db
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
                or(
                  isNull(jobs.requirements),
                  isNull(jobs.deadline),
                  isNull(jobs.employerUrl),
                  eq(jobs.isAggregatorSource, true)
                )
              )
            )
            .limit(REVIEW_BATCH_SIZE)
        );
      });

      console.log(`[DataReview] Dispatching ${pendingJobs.length} jobs for review`);
      for (const job of pendingJobs) {
        dispatchedEvents.push({
          name: "data.review.process",
          data: { id: job.id, module: "jobs", sourceUrl: job.sourceUrl, title: job.title, companyName: job.companyName },
        });
      }
    }

    // ── TENDERS ──
    if (module === "all" || module === "tenders") {
      const pendingTenders = await step.run("fetch-candidate-tenders", async () => {
        return await executeWithRetry(() =>
          db
            .select({
              id: tenders.id,
              sourceUrl: tenders.sourceUrl,
              title: tenders.title,
              contractingAuthority: tenders.contractingAuthority,
            })
            .from(tenders)
            .where(
              or(
                sql`length(coalesce(${tenders.description}, '')) < 200`,
                isNull(tenders.employerUrl)
              )
            )
            .limit(REVIEW_BATCH_SIZE)
        );
      });

      console.log(`[DataReview] Dispatching ${pendingTenders.length} tenders for review`);
      for (const tender of pendingTenders) {
        dispatchedEvents.push({
          name: "data.review.process",
          data: { id: tender.id, module: "tenders", sourceUrl: tender.sourceUrl, title: tender.title, companyName: tender.contractingAuthority },
        });
      }
    }

    // ── COMPLIANCE ──
    if (module === "all" || module === "compliance") {
      const pendingCompliance = await step.run("fetch-candidate-compliance", async () => {
        return await executeWithRetry(() =>
          db
            .select({
              id: complianceRequirements.id,
              sourceUrl: complianceRequirements.sourceUrl,
              title: complianceRequirements.title,
              issuingAuthority: complianceRequirements.issuingAuthority,
            })
            .from(complianceRequirements)
            .where(
              or(
                sql`length(coalesce(${complianceRequirements.description}, '')) < 200`,
                isNull(complianceRequirements.employerUrl)
              )
            )
            .limit(REVIEW_BATCH_SIZE)
        );
      });

      console.log(`[DataReview] Dispatching ${pendingCompliance.length} compliance records for review`);
      for (const comp of pendingCompliance) {
        dispatchedEvents.push({
          name: "data.review.process",
          data: { id: comp.id, module: "compliance", sourceUrl: comp.sourceUrl, title: comp.title, companyName: comp.issuingAuthority },
        });
      }
    }

    // Dispatch in chunks of 500
    for (const [i, chunk] of chunkArray(dispatchedEvents, 500).entries()) {
      await step.sendEvent(`dispatch-review-batch-${i}`, chunk);
    }

    return {
      dispatched: dispatchedEvents.length,
      modules: module,
    };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. WORKER — Processes a single record
// ─────────────────────────────────────────────────────────────────────────────
export const dataReviewWorker = inngest.createFunction(
  {
    id: "data-review-enrichment-worker",
    name: "Worker: Jev Data Review & Enrich Record",
    concurrency: { limit: 8 }, // Safe concurrency for external fetches
    retries: 1,
    triggers: [{ event: "data.review.process" }],
  },
  async ({ event, step }) => {
    const { id, module, sourceUrl, title, companyName } = event.data as {
      id: string;
      module: "jobs" | "tenders" | "compliance";
      sourceUrl: string;
      title: string;
      companyName: string;
    };

    // ── Fetch full record from DB ──
    const record = await step.run("fetch-record", async () => {
      if (module === "jobs") {
        const [r] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
        return r || null;
      } else if (module === "tenders") {
        const [r] = await db.select().from(tenders).where(eq(tenders.id, id)).limit(1);
        return r || null;
      } else {
        const [r] = await db.select().from(complianceRequirements).where(eq(complianceRequirements.id, id)).limit(1);
        return r || null;
      }
    });

    if (!record) return { status: "not_found" };

    // ── Fetch source HTML ──
    const html = await step.run("fetch-source-html", async () => {
      const urlToFetch =
        module === "jobs"
          ? ((record as any).employerUrl && isEmployerUrl((record as any).employerUrl)
              ? (record as any).employerUrl
              : sourceUrl)
          : module === "tenders"
          ? ((record as any).employerUrl || (record as any).documentUrl || sourceUrl)
          : (sourceUrl);

      return await fetchPageHtml(urlToFetch, 8000);
    });

    if (!html) {
      return { id, module, status: "fetch_failed", reason: "Could not fetch source HTML" };
    }

    // ── Extract enriched fields ──
    const extracted = await step.run("extract-fields", () => {
      return extractCleanJobFields(html, sourceUrl);
    });

    // ── Jev System One review ──
    const review = await step.run("jev-review", () => {
      const stateText = `Title: ${title}\nCompany: ${companyName || ""}\n${extracted.cleanText.substring(0, 3000)}`;
      return reviewRecordWithJev(stateText);
    });

    // ── Build update payload ──
    const fieldsUpdated: string[] = [];

    const updatePayload: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (module === "jobs") {
      const job = record as unknown as typeof jobs.$inferSelect;

      // Company name correction (e.g. TRA scraper glitch)
      if (job.companyName === "TRA" || !job.companyName) {
        const candidateCompany = extractCompanyFromTitleOrText(job.title, job.description);
        if (candidateCompany && candidateCompany !== job.companyName) {
          updatePayload.companyName = candidateCompany;
          fieldsUpdated.push("companyName");
        }
      }

      // Employer URL resolution
      if (extracted.directEmployerUrl && (!job.employerUrl || isAggregatorUrl(job.employerUrl))) {
        updatePayload.employerUrl = extracted.directEmployerUrl;
        updatePayload.isAggregatorSource = false;
        fieldsUpdated.push("employerUrl", "isAggregatorSource");
      } else if (!job.employerUrl && (isAtsPlatform(job.sourceUrl) || isEmployerUrl(job.sourceUrl))) {
        updatePayload.employerUrl = job.sourceUrl;
        updatePayload.isAggregatorSource = false;
        fieldsUpdated.push("employerUrl", "isAggregatorSource");
      }

      if (!job.requirements && extracted.requirements) {
        updatePayload.requirements = extracted.requirements;
        fieldsUpdated.push("requirements");
      }
      if (!job.deadline && extracted.deadline) {
        updatePayload.deadline = extracted.deadline;
        fieldsUpdated.push("deadline");
      }
      if (extracted.deadline && new Date(extracted.deadline) < new Date()) {
        updatePayload.isActive = false;
        fieldsUpdated.push("isActive(expired)");
      }
      if (extracted.salary.salaryMin && !job.salaryMin) {
        updatePayload.salaryMin = extracted.salary.salaryMin.toString();
        updatePayload.salaryMax = extracted.salary.salaryMax?.toString() ?? null;
        updatePayload.salaryCurrency = extracted.salary.salaryCurrency;
        fieldsUpdated.push("salary");
      }
      if (extracted.applicationEmail && job.description && job.description.includes("[email protected]")) {
        updatePayload.description = job.description.replace(
          /\[email\s*protected\]/gi,
          extracted.applicationEmail
        );
        fieldsUpdated.push("description(decoded_email)");
      } else if (review?.qualityLevel === "shallow" || review?.qualityLevel === "empty") {
        if (extracted.cleanText.length > (job.description?.length ?? 0) + 100) {
          updatePayload.description = extracted.cleanText;
          fieldsUpdated.push("description");
        }
      }
      // Deactivate clearly illegitimate postings
      if (review && review.isLegitimateProb < 0.2) {
        updatePayload.isActive = false;
        fieldsUpdated.push("isActive(deactivated)");
      }

      if (fieldsUpdated.length > 0) {
        await step.run("update-db", () =>
          db.update(jobs).set(updatePayload).where(eq(jobs.id, id))
        );
      }
    } else if (module === "tenders") {
      const tender = record as unknown as typeof tenders.$inferSelect;

      if (extracted.directEmployerUrl && !tender.employerUrl) {
        updatePayload.employerUrl = extracted.directEmployerUrl;
        updatePayload.isAggregatorSource = false;
        fieldsUpdated.push("employerUrl");
      }
      if (!tender.deadline && extracted.deadline) {
        updatePayload.deadline = extracted.deadline;
        fieldsUpdated.push("deadline");
      }
      if (
        (review?.qualityLevel === "shallow" || review?.qualityLevel === "empty") &&
        extracted.cleanText.length > (tender.description?.length ?? 0) + 100
      ) {
        updatePayload.description = extracted.cleanText;
        fieldsUpdated.push("description");
      }

      if (fieldsUpdated.length > 0) {
        await step.run("update-db", () =>
          db.update(tenders).set(updatePayload).where(eq(tenders.id, id))
        );
      }
    } else if (module === "compliance") {
      const comp = record as unknown as typeof complianceRequirements.$inferSelect;

      if (extracted.directEmployerUrl && !comp.employerUrl) {
        updatePayload.employerUrl = extracted.directEmployerUrl;
        fieldsUpdated.push("employerUrl");
      }
      if (
        (review?.qualityLevel === "shallow" || review?.qualityLevel === "empty") &&
        extracted.cleanText.length > (comp.description?.length ?? 0) + 100
      ) {
        updatePayload.description = extracted.cleanText;
        fieldsUpdated.push("description");
      }

      if (fieldsUpdated.length > 0) {
        await step.run("update-db", () =>
          db
            .update(complianceRequirements)
            .set(updatePayload)
            .where(eq(complianceRequirements.id, id))
        );
      }
    }

    const status =
      fieldsUpdated.length === 0
        ? "already_adheres"
        : fieldsUpdated.includes("employerUrl") || fieldsUpdated.includes("isAggregatorSource")
        ? "aggregator_resolved"
        : "enriched";

    console.log(
      `[DataReview] ${module} ${id} → ${status} | quality=${review?.qualityLevel} | updated: [${fieldsUpdated.join(", ")}]`
    );

    return {
      id,
      module,
      status,
      quality: review?.qualityLevel,
      fieldsUpdated,
    };
  }
);
