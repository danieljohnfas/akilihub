import { inngest } from "./client";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema/jobs";
import { tenders } from "@/lib/db/schema/tenders";
import { complianceRequirements } from "@/lib/db/schema/compliance";
import { eq, and, isNull, or, lt, sql, not, like } from "drizzle-orm";
import { fetchHtml, htmlToTextEnriched, fetchAndParseDocument } from "@/lib/scrapers/compliance-base";
import { extractJobsWithAI } from "@/lib/scrapers/broad-search-engine";
import { extractTendersWithAI } from "@/lib/scrapers/broad-search-engine-tenders";
import { extractComplianceWithAI } from "@/lib/scrapers/broad-search-engine-compliance";
import { executeWithRetry, chunkArray } from "@/lib/db/query-resilience";

// ── Shallowness thresholds ─────────────────────────────────────────────────────
const JOB_DESC_MIN_LEN   = 300;
const TENDER_DESC_MIN_LEN = 200;
const COMPLIANCE_DESC_MIN_LEN = 250;

function isRealUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.hash && !parsed.pathname.includes('.')) return false;
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function richer(existing: string | null | undefined, candidate: string | null | undefined): string | null {
  if (!candidate || candidate.trim().length === 0) return existing ?? null;
  if (!existing || existing.trim().length === 0) return candidate;
  return candidate.trim().length > existing.trim().length ? candidate.trim() : existing.trim();
}

function isDirectDocumentUrl(url: string): boolean {
  const lower = url.toLowerCase().split('?')[0];
  return ['.pdf', '.docx', '.doc', '.xlsx', '.zip', '.png', '.jpg', '.jpeg', '.webp'].some(ext => lower.includes(ext));
}

function tokenOverlap(a: string, b: string): number {
  const tokA = new Set(a.toLowerCase().split(/\W+/).filter(t => t.length > 2));
  const tokB = new Set(b.toLowerCase().split(/\W+/).filter(t => t.length > 2));
  let overlap = 0;
  for (const t of tokA) if (tokB.has(t)) overlap++;
  return tokA.size === 0 ? 0 : overlap / tokA.size;
}

async function refetchAndExtractJobs(url: string) {
  if (isDirectDocumentUrl(url)) {
    const docText = await fetchAndParseDocument(url);
    if (docText && docText.length > 50) return await extractJobsWithAI(docText, url);
  }
  const html = await fetchHtml(url);
  if (!html) return [];
  const { text } = await htmlToTextEnriched(html, url);
  return await extractJobsWithAI(text, url);
}

async function refetchAndExtractTenders(url: string) {
  if (isDirectDocumentUrl(url)) {
    const docText = await fetchAndParseDocument(url);
    if (docText && docText.length > 50) return await extractTendersWithAI(docText, url, [url]);
  }
  const html = await fetchHtml(url);
  if (!html) return [];
  const { text, pdfLinks } = await htmlToTextEnriched(html, url);
  return await extractTendersWithAI(text, url, pdfLinks);
}

async function refetchAndExtractCompliance(url: string) {
  if (isDirectDocumentUrl(url)) {
    const docText = await fetchAndParseDocument(url);
    if (docText && docText.length > 50) return await extractComplianceWithAI(docText, url, [url]);
  }
  const html = await fetchHtml(url);
  if (!html) return [];
  const { text, pdfLinks } = await htmlToTextEnriched(html, url);
  return await extractComplianceWithAI(text, url, pdfLinks);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE DISPATCHER (Cron Job)
// ─────────────────────────────────────────────────────────────────────────────
export const enrichShallowDataJob = inngest.createFunction(
  {
    id: "enrich-shallow-data-dispatcher",
    name: "🔬 Enrich Shallow Data (Dispatcher)",
    triggers: [{ cron: "30 11 * * *" }, { event: "manual.data.review" }], // 11:30 UTC daily or manual trigger
  },
  async ({ step }) => {
    
    // JOBS
    const shallowJobs = await step.run("fetch-shallow-jobs", async () => {
      return await executeWithRetry(() => db
        .select({ id: jobs.id, title: jobs.title, description: jobs.description, requirements: jobs.requirements, sourceUrl: jobs.sourceUrl, employerUrl: jobs.employerUrl })
        .from(jobs)
        .where(
          and(
            eq(jobs.isActive, true),
            or(lt(sql<number>`length(${jobs.description})`, JOB_DESC_MIN_LEN), isNull(jobs.requirements)),
            not(like(jobs.sourceUrl, '%#%'))
          )
        )
      );
    });

    const jobEvents = shallowJobs.map(job => ({
      name: "data.job.enrich",
      data: {
        id: job.id,
        targetUrl: (job.employerUrl && isRealUrl(job.employerUrl)) ? job.employerUrl : job.sourceUrl,
        shallowTitle: job.title,
        shallowDesc: job.description,
        shallowReq: job.requirements,
      }
    })).filter(e => isRealUrl(e.data.targetUrl));

    if (jobEvents.length > 0) {
      // Send events in chunks of 500
      for (const [i, chunk] of chunkArray(jobEvents, 500).entries()) {
        await step.sendEvent(`dispatch-jobs-batch-${i}`, chunk);
      }
    }

    // TENDERS
    const shallowTenders = await step.run("fetch-shallow-tenders", async () => {
      return await executeWithRetry(() => db
        .select({ id: tenders.id, title: tenders.title, description: tenders.description, sourceUrl: tenders.sourceUrl, employerUrl: tenders.employerUrl })
        .from(tenders)
        .where(
          and(
            eq(tenders.status, "open"),
            or(isNull(tenders.description), lt(sql<number>`length(coalesce(${tenders.description}, ''))`, TENDER_DESC_MIN_LEN)),
            not(like(tenders.sourceUrl, '%#%'))
          )
        )
      );
    });

    const tenderEvents = shallowTenders.map(t => ({
      name: "data.tender.enrich",
      data: {
        id: t.id,
        targetUrl: (t.employerUrl && isRealUrl(t.employerUrl)) ? t.employerUrl : t.sourceUrl,
        shallowTitle: t.title,
        shallowDesc: t.description,
        issuingAuthority: null, // extracted later
      }
    })).filter(e => isRealUrl(e.data.targetUrl));

    if (tenderEvents.length > 0) {
      for (const [i, chunk] of chunkArray(tenderEvents, 500).entries()) {
        await step.sendEvent(`dispatch-tenders-batch-${i}`, chunk);
      }
    }

    // COMPLIANCE
    const shallowCompliance = await step.run("fetch-shallow-compliance", async () => {
      return await executeWithRetry(() => db
        .select({ id: complianceRequirements.id, title: complianceRequirements.title, description: complianceRequirements.description, sourceUrl: complianceRequirements.sourceUrl, employerUrl: complianceRequirements.employerUrl, issuingAuthority: complianceRequirements.issuingAuthority })
        .from(complianceRequirements)
        .where(
          and(
            eq(complianceRequirements.isActive, true),
            not(isNull(complianceRequirements.sourceUrl)),
            lt(sql<number>`length(${complianceRequirements.description})`, COMPLIANCE_DESC_MIN_LEN),
            not(like(complianceRequirements.sourceUrl, '%#%'))
          )
        )
      );
    });

    const compEvents = shallowCompliance.map(c => ({
      name: "data.compliance.enrich",
      data: {
        id: c.id,
        targetUrl: (c.employerUrl && isRealUrl(c.employerUrl)) ? c.employerUrl : c.sourceUrl!,
        shallowTitle: c.title,
        shallowDesc: c.description,
        issuingAuthority: c.issuingAuthority,
      }
    })).filter(e => isRealUrl(e.data.targetUrl));

    if (compEvents.length > 0) {
      for (const [i, chunk] of chunkArray(compEvents, 500).entries()) {
        await step.sendEvent(`dispatch-compliance-batch-${i}`, chunk);
      }
    }

    // PING SEARCH ENGINES
    await step.run("ping-search-engines", async () => {
      const SITEMAP_URL = encodeURIComponent("https://akilibrain.com/sitemap.xml");
      try { await fetch(`https://www.google.com/ping?sitemap=${SITEMAP_URL}`); } catch (e) {}
      try { await fetch(`https://www.bing.com/ping?sitemap=${SITEMAP_URL}`); } catch (e) {}
      return true;
    });

    return { message: "Shallow data dispatched to workers", jobs: jobEvents.length, tenders: tenderEvents.length, compliance: compEvents.length };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE WORKERS (Event Listeners)
// ─────────────────────────────────────────────────────────────────────────────

export const enrichJobWorker = inngest.createFunction(
  { id: "enrich-job-worker", name: "Worker: Enrich Job", concurrency: 10 },
  { event: "data.job.enrich" },
  async ({ event, step }) => {
    const { id, targetUrl, shallowTitle, shallowDesc, shallowReq } = event.data;
    
    const extracted = await step.run("extract-url", () => refetchAndExtractJobs(targetUrl));
    if (extracted.length === 0) return { status: "no_data_extracted" };

    const best = extracted
      .map(e => ({ e, score: tokenOverlap(shallowTitle, e.title) }))
      .sort((a, b) => b.score - a.score)[0];

    if (!best || best.score < 0.3) return { status: "no_title_match" };

    await step.run("update-db", async () => {
      const richDesc = richer(shallowDesc, best.e.description);
      const richReqs = richer(shallowReq, best.e.requirements);

      const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
      if (richDesc && richDesc !== shallowDesc)       updatePayload.description  = richDesc;
      if (richReqs && richReqs !== shallowReq)        updatePayload.requirements = richReqs;
      if (best.e.deadline && !shallowDesc.includes('deadline')) updatePayload.deadline = best.e.deadline;
      if (best.e.salaryMin)     updatePayload.salaryMin     = best.e.salaryMin.toString();
      if (best.e.salaryMax)     updatePayload.salaryMax     = best.e.salaryMax.toString();
      if (best.e.salaryCurrency) updatePayload.salaryCurrency = best.e.salaryCurrency;

      if (Object.keys(updatePayload).length > 1) {
        await executeWithRetry(() => db.update(jobs).set(updatePayload).where(eq(jobs.id, id)));
      }
    });

    return { status: "enriched" };
  }
);

export const enrichTenderWorker = inngest.createFunction(
  { id: "enrich-tender-worker", name: "Worker: Enrich Tender", concurrency: 10 },
  { event: "data.tender.enrich" },
  async ({ event, step }) => {
    const { id, targetUrl, shallowTitle, shallowDesc } = event.data;
    
    const extracted = await step.run("extract-url", () => refetchAndExtractTenders(targetUrl));
    if (extracted.length === 0) return { status: "no_data_extracted" };

    const best = extracted
      .map(e => ({ e, score: tokenOverlap(shallowTitle, e.title) }))
      .sort((a, b) => b.score - a.score)[0];

    if (!best || best.score < 0.3) return { status: "no_title_match" };

    await step.run("update-db", async () => {
      const richDesc = richer(shallowDesc, best.e.description ?? null);
      const updatePayload: Record<string, unknown> = { updatedAt: new Date() };

      if (richDesc && richDesc !== shallowDesc) updatePayload.description = richDesc;
      if (best.e.deadline)  updatePayload.deadline = best.e.deadline;
      if (best.e.budget)    updatePayload.budget   = best.e.budget.toString();
      if (best.e.currency && best.e.currency !== 'USD') updatePayload.currency = best.e.currency;

      if (Object.keys(updatePayload).length > 1) {
        await executeWithRetry(() => db.update(tenders).set(updatePayload).where(eq(tenders.id, id)));
      }
    });

    return { status: "enriched" };
  }
);

export const enrichComplianceWorker = inngest.createFunction(
  { id: "enrich-compliance-worker", name: "Worker: Enrich Compliance", concurrency: 10 },
  { event: "data.compliance.enrich" },
  async ({ event, step }) => {
    const { id, targetUrl, shallowTitle, shallowDesc, issuingAuthority } = event.data;
    
    const extracted = await step.run("extract-url", () => refetchAndExtractCompliance(targetUrl));
    if (extracted.length === 0) return { status: "no_data_extracted" };

    const best = extracted
      .map(e => ({ e, score: tokenOverlap(shallowTitle, e.title) }))
      .sort((a, b) => b.score - a.score)[0];

    if (!best || best.score < 0.25) return { status: "no_title_match" };

    await step.run("update-db", async () => {
      const richDesc = richer(shallowDesc, best.e.description);
      const updatePayload: Record<string, unknown> = { updatedAt: new Date(), lastVerifiedAt: new Date() };

      if (richDesc && richDesc !== shallowDesc)   updatePayload.description = richDesc;
      if (best.e.issuingAuthority && best.e.issuingAuthority.length > (issuingAuthority?.length ?? 0)) {
        updatePayload.issuingAuthority = best.e.issuingAuthority;
      }

      if (Object.keys(updatePayload).length > 2) {
        await executeWithRetry(() => db.update(complianceRequirements).set(updatePayload).where(eq(complianceRequirements.id, id)));
      }
    });

    return { status: "enriched" };
  }
);
