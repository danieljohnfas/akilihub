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
import { executeWithRetry } from "@/lib/db/query-resilience";

/**
 * ENRICH SHALLOW DATA
 *
 * Purpose:
 *   Identifies records inserted with shallow/thin data — short descriptions,
 *   missing requirements, empty fields — and re-fetches their source URLs to
 *   re-extract richer content using the upgraded AI prompts (SCRAPING_GUIDELINES).
 *
 * This is the daily "data quality repair loop" that catches any record that was
 * inserted before the improved extraction prompts were in place, or that was
 * extracted from a page that happened to return minimal content on first pass.
 *
 * Shallowness thresholds:
 *   - Jobs:       description < 300 chars  OR  requirements IS NULL
 *   - Tenders:    description < 200 chars  OR  description IS NULL
 *   - Compliance: description < 250 chars
 *
 * Safety rules:
 *   - Only re-enriches records whose sourceUrl is a real URL (not an aggregator
 *     fragment anchor like `https://site.com#job-slug-1`).
 *   - Processes at most 60 jobs, 40 tenders, 30 compliance records per run
 *     to stay within Vercel's function execution window.
 *   - Uses onConflict-safe UPDATE — only overwrites a field if the new value
 *     is actually richer (longer) than the existing one.
 *   - Runs at 11:30 UTC daily — after all scrapers (which finish by ~10:30 UTC).
 */

// ── Shallowness thresholds ─────────────────────────────────────────────────────
const JOB_DESC_MIN_LEN   = 300;  // chars — below this means the AI truncated
const TENDER_DESC_MIN_LEN = 200;
const COMPLIANCE_DESC_MIN_LEN = 250;

// ── Batch limits per daily run ─────────────────────────────────────────────────
const BATCH_JOBS       = 60;
const BATCH_TENDERS    = 40;
const BATCH_COMPLIANCE = 30;

// ── Helper: is this a real URL we can fetch? ───────────────────────────────────
// Aggregator fragments (e.g. https://site.com#slug-3) cannot be re-fetched.
function isRealUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    // Reject fragment-only anchors (our dedup slug pattern)
    if (parsed.hash && !parsed.pathname.includes('.')) return false;
    // Must be http/https
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// ── Helper: richer wins — only replace if new value is longer ─────────────────
function richer(existing: string | null | undefined, candidate: string | null | undefined): string | null {
  if (!candidate || candidate.trim().length === 0) return existing ?? null;
  if (!existing || existing.trim().length === 0) return candidate;
  return candidate.trim().length > existing.trim().length ? candidate.trim() : existing.trim();
}

function isDirectDocumentUrl(url: string): boolean {
  const lower = url.toLowerCase().split('?')[0];
  return ['.pdf', '.docx', '.doc', '.xlsx', '.zip', '.png', '.jpg', '.jpeg', '.webp'].some(ext => lower.includes(ext));
}

// ── Re-fetch + extract helpers ─────────────────────────────────────────────────
async function refetchAndExtractJobs(url: string) {
  if (isDirectDocumentUrl(url)) {
    const docText = await fetchAndParseDocument(url);
    if (docText && docText.length > 50) {
      return await extractJobsWithAI(docText, url);
    }
  }
  const html = await fetchHtml(url);
  if (!html) return [];
  const { text } = await htmlToTextEnriched(html, url);
  return await extractJobsWithAI(text, url);
}

async function refetchAndExtractTenders(url: string) {
  if (isDirectDocumentUrl(url)) {
    const docText = await fetchAndParseDocument(url);
    if (docText && docText.length > 50) {
      return await extractTendersWithAI(docText, url, [url]);
    }
  }
  const html = await fetchHtml(url);
  if (!html) return [];
  const { text, pdfLinks } = await htmlToTextEnriched(html, url);
  return await extractTendersWithAI(text, url, pdfLinks);
}

async function refetchAndExtractCompliance(url: string) {
  if (isDirectDocumentUrl(url)) {
    const docText = await fetchAndParseDocument(url);
    if (docText && docText.length > 50) {
      return await extractComplianceWithAI(docText, url, [url]);
    }
  }
  const html = await fetchHtml(url);
  if (!html) return [];
  const { text, pdfLinks } = await htmlToTextEnriched(html, url);
  return await extractComplianceWithAI(text, url, pdfLinks);
}

// ── Title similarity — pick the best match from re-extracted records ──────────
function tokenOverlap(a: string, b: string): number {
  const tokA = new Set(a.toLowerCase().split(/\W+/).filter(t => t.length > 2));
  const tokB = new Set(b.toLowerCase().split(/\W+/).filter(t => t.length > 2));
  let overlap = 0;
  for (const t of tokA) if (tokB.has(t)) overlap++;
  return tokA.size === 0 ? 0 : overlap / tokA.size;
}

// ─────────────────────────────────────────────────────────────────────────────
// INNGEST FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
export const enrichShallowDataJob = inngest.createFunction(
  {
    id: "enrich-shallow-data",
    name: "🔬 Enrich Shallow Data",
    triggers: [{ cron: "30 11 * * *" }],  // 11:30 UTC daily, after all scrapers finish
  },
  async ({ step }) => {

    // ═══════════════════════════════════════════════════
    // STEP 1 — JOBS enrichment
    // ═══════════════════════════════════════════════════
    const jobsResult = await step.run("enrich-shallow-jobs", async () => {
      // Find shallow job records: short description OR missing requirements
      const shallowJobs = await executeWithRetry(() => db
        .select({
          id: jobs.id,
          title: jobs.title,
          description: jobs.description,
          requirements: jobs.requirements,
          sourceUrl: jobs.sourceUrl,
          employerUrl: jobs.employerUrl,
        })
        .from(jobs)
        .where(
          and(
            eq(jobs.isActive, true),
            or(
              lt(sql<number>`length(${jobs.description})`, JOB_DESC_MIN_LEN),
              isNull(jobs.requirements),
            ),
            // Only real URLs we can fetch
            not(like(jobs.sourceUrl, '%#%')),
          )
        )
        .limit(BATCH_JOBS), { label: 'enrich-shallow-jobs-select' });

      console.log(`[enrich-jobs] Found ${shallowJobs.length} shallow job records.`);

      let enriched = 0;
      let failed = 0;

      // Group by targetUrl (employerUrl preferred, then sourceUrl) to batch re-fetches
      const byUrl = new Map<string, typeof shallowJobs>();
      for (const job of shallowJobs) {
        const targetUrl = job.employerUrl || job.sourceUrl;
        if (!isRealUrl(targetUrl)) continue;
        const list = byUrl.get(targetUrl) ?? [];
        list.push(job);
        byUrl.set(targetUrl, list);
      }

      for (const [url, jobGroup] of byUrl) {
        try {
          const extracted = await refetchAndExtractJobs(url);
          if (extracted.length === 0) { failed += jobGroup.length; continue; }

          for (const shallow of jobGroup) {
            // Match extracted record with highest title overlap
            const best = extracted
              .map(e => ({ e, score: tokenOverlap(shallow.title, e.title) }))
              .sort((a, b) => b.score - a.score)[0];

            if (!best || best.score < 0.3) continue; // no confident match

            const richDesc = richer(shallow.description, best.e.description);
            const richReqs = richer(shallow.requirements, best.e.requirements);

            const updatePayload: Record<string, unknown> = {
              updatedAt: new Date(),
            };
            if (richDesc && richDesc !== shallow.description)       updatePayload.description  = richDesc;
            if (richReqs && richReqs !== shallow.requirements)      updatePayload.requirements = richReqs;
            if (best.e.deadline && !shallow.description.includes('deadline')) updatePayload.deadline = best.e.deadline;
            if (best.e.salaryMin)     updatePayload.salaryMin     = best.e.salaryMin.toString();
            if (best.e.salaryMax)     updatePayload.salaryMax     = best.e.salaryMax.toString();
            if (best.e.salaryCurrency) updatePayload.salaryCurrency = best.e.salaryCurrency;

            if (Object.keys(updatePayload).length > 1) { // more than just updatedAt
              await executeWithRetry(() => db.update(jobs).set(updatePayload).where(eq(jobs.id, shallow.id)), { label: 'enrich-job-update' });
              enriched++;
            }
          }

          await new Promise(r => setTimeout(r, 1500)); // polite delay
        } catch (e) {
          console.error(`[enrich-jobs] Failed for ${url}:`, (e as Error).message);
          failed += jobGroup.length;
        }
      }

      console.log(`[enrich-jobs] Done. Enriched: ${enriched}, Failed: ${failed}`);
      return { enriched, failed };
    });

    // ═══════════════════════════════════════════════════
    // STEP 2 — TENDERS enrichment
    // ═══════════════════════════════════════════════════
    const tendersResult = await step.run("enrich-shallow-tenders", async () => {
      const shallowTenders = await executeWithRetry(() => db
        .select({
          id: tenders.id,
          title: tenders.title,
          description: tenders.description,
          sourceUrl: tenders.sourceUrl,
          employerUrl: tenders.employerUrl,
          referenceNo: tenders.referenceNo,
        })
        .from(tenders)
        .where(
          and(
            eq(tenders.status, "open"),
            or(
              isNull(tenders.description),
              lt(sql<number>`length(coalesce(${tenders.description}, ''))`, TENDER_DESC_MIN_LEN),
            ),
            not(like(tenders.sourceUrl, '%#%')),
          )
        )
        .limit(BATCH_TENDERS), { label: 'enrich-shallow-tenders-select' });

      console.log(`[enrich-tenders] Found ${shallowTenders.length} shallow tender records.`);

      let enriched = 0;
      let failed = 0;

      const byUrl = new Map<string, typeof shallowTenders>();
      for (const t of shallowTenders) {
        const targetUrl = t.employerUrl || t.sourceUrl;
        if (!isRealUrl(targetUrl)) continue;
        const list = byUrl.get(targetUrl) ?? [];
        list.push(t);
        byUrl.set(targetUrl, list);
      }

      for (const [url, tenderGroup] of byUrl) {
        try {
          const extracted = await refetchAndExtractTenders(url);
          if (extracted.length === 0) { failed += tenderGroup.length; continue; }

          for (const shallow of tenderGroup) {
            const best = extracted
              .map(e => ({ e, score: tokenOverlap(shallow.title, e.title) }))
              .sort((a, b) => b.score - a.score)[0];

            if (!best || best.score < 0.3) continue;

            const richDesc = richer(shallow.description, best.e.description ?? null);
            const updatePayload: Record<string, unknown> = { updatedAt: new Date() };

            if (richDesc && richDesc !== shallow.description) updatePayload.description = richDesc;
            if (best.e.deadline)  updatePayload.deadline = best.e.deadline;
            if (best.e.budget)    updatePayload.budget   = best.e.budget.toString();
            if (best.e.currency && best.e.currency !== 'USD') updatePayload.currency = best.e.currency;

            if (Object.keys(updatePayload).length > 1) {
              await executeWithRetry(() => db.update(tenders).set(updatePayload).where(eq(tenders.id, shallow.id)), { label: 'enrich-tender-update' });
              enriched++;
            }
          }

          await new Promise(r => setTimeout(r, 1500));
        } catch (e) {
          console.error(`[enrich-tenders] Failed for ${url}:`, (e as Error).message);
          failed += tenderGroup.length;
        }
      }

      console.log(`[enrich-tenders] Done. Enriched: ${enriched}, Failed: ${failed}`);
      return { enriched, failed };
    });

    // ═══════════════════════════════════════════════════
    // STEP 3 — COMPLIANCE enrichment
    // ═══════════════════════════════════════════════════
    const complianceResult = await step.run("enrich-shallow-compliance", async () => {
      const shallowCompliance = await executeWithRetry(() => db
        .select({
          id: complianceRequirements.id,
          title: complianceRequirements.title,
          description: complianceRequirements.description,
          sourceUrl: complianceRequirements.sourceUrl,
          employerUrl: complianceRequirements.employerUrl,
          issuingAuthority: complianceRequirements.issuingAuthority,
        })
        .from(complianceRequirements)
        .where(
          and(
            eq(complianceRequirements.isActive, true),
            not(isNull(complianceRequirements.sourceUrl)),
            lt(sql<number>`length(${complianceRequirements.description})`, COMPLIANCE_DESC_MIN_LEN),
            not(like(complianceRequirements.sourceUrl, '%#%')),
          )
        )
        .limit(BATCH_COMPLIANCE), { label: 'enrich-shallow-compliance-select' });

      console.log(`[enrich-compliance] Found ${shallowCompliance.length} shallow compliance records.`);

      let enriched = 0;
      let failed = 0;

      const byUrl = new Map<string, typeof shallowCompliance>();
      for (const c of shallowCompliance) {
        const targetUrl = c.employerUrl || c.sourceUrl;
        if (!isRealUrl(targetUrl)) continue;
        const list = byUrl.get(targetUrl!) ?? [];
        list.push(c);
        byUrl.set(targetUrl!, list);
      }

      for (const [url, compGroup] of byUrl) {
        try {
          const extracted = await refetchAndExtractCompliance(url);
          if (extracted.length === 0) { failed += compGroup.length; continue; }

          for (const shallow of compGroup) {
            const best = extracted
              .map(e => ({ e, score: tokenOverlap(shallow.title, e.title) }))
              .sort((a, b) => b.score - a.score)[0];

            if (!best || best.score < 0.25) continue; // lower threshold — compliance titles vary

            const richDesc = richer(shallow.description, best.e.description);
            const updatePayload: Record<string, unknown> = {
              updatedAt: new Date(),
              lastVerifiedAt: new Date(),  // Mark as re-verified today
            };

            if (richDesc && richDesc !== shallow.description)   updatePayload.description     = richDesc;
            if (best.e.issuingAuthority && best.e.issuingAuthority.length > (shallow.issuingAuthority?.length ?? 0)) {
              updatePayload.issuingAuthority = best.e.issuingAuthority;
            }

            if (Object.keys(updatePayload).length > 2) { // more than updatedAt + lastVerifiedAt
              await executeWithRetry(() => db.update(complianceRequirements).set(updatePayload).where(eq(complianceRequirements.id, shallow.id)), { label: 'enrich-compliance-update' });
              enriched++;
            }
          }

          await new Promise(r => setTimeout(r, 1500));
        } catch (e) {
          console.error(`[enrich-compliance] Failed for ${url}:`, (e as Error).message);
          failed += compGroup.length;
        }
      }

      console.log(`[enrich-compliance] Done. Enriched: ${enriched}, Failed: ${failed}`);
      return { enriched, failed };
    });

    // ═══════════════════════════════════════════════════
    // STEP 4 — PING SEARCH ENGINES
    // Notify Google, Bing, and IndexNow that the sitemap
    // has been updated so GSC always reflects the latest count.
    // Google's ping URL needs no authentication.
    // ═══════════════════════════════════════════════════
    const pingResult = await step.run("ping-search-engines", async () => {
      const SITEMAP_URL = encodeURIComponent("https://akilibrain.com/sitemap.xml");
      const results: Record<string, string> = {};

      // Google — standard sitemap ping (no auth required)
      try {
        const r = await fetch(`https://www.google.com/ping?sitemap=${SITEMAP_URL}`, {
          method: "GET",
          signal: AbortSignal.timeout(10_000),
        });
        results.google = `${r.status} ${r.statusText}`;
        console.log(`[ping] Google: ${results.google}`);
      } catch (e) {
        results.google = `ERROR: ${(e as Error).message}`;
        console.error(`[ping] Google failed:`, results.google);
      }

      // Bing — same style ping endpoint
      try {
        const r = await fetch(`https://www.bing.com/ping?sitemap=${SITEMAP_URL}`, {
          method: "GET",
          signal: AbortSignal.timeout(10_000),
        });
        results.bing = `${r.status} ${r.statusText}`;
        console.log(`[ping] Bing: ${results.bing}`);
      } catch (e) {
        results.bing = `ERROR: ${(e as Error).message}`;
        console.error(`[ping] Bing failed:`, results.bing);
      }

      console.log(`[ping] All search engines notified.`, results);
      return results;
    });

    // ── Summary ────────────────────────────────────────────────────────────────
    const summary = {
      jobs:       jobsResult,
      tenders:    tendersResult,
      compliance: complianceResult,
      totalEnriched: jobsResult.enriched + tendersResult.enriched + complianceResult.enriched,
      sitemapPings: pingResult,
    };

    console.log(`[enrich-shallow-data] Complete.`, summary);
    return { message: "Shallow data enrichment complete.", ...summary };
  }
);
