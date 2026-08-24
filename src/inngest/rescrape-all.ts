import { inngest } from "./client";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema/jobs";
import { tenders } from "@/lib/db/schema/tenders";
import { complianceRequirements } from "@/lib/db/schema/compliance";
import { fetchHtml, htmlToTextEnriched } from "@/lib/scrapers/compliance-base";
import { extractJobsWithAI } from "@/lib/scrapers/broad-search-engine";
import { extractTendersWithAI } from "@/lib/scrapers/broad-search-engine-tenders";
import { extractComplianceWithAI } from "@/lib/scrapers/broad-search-engine-compliance";
import { eq, isNotNull, asc, and } from "drizzle-orm";

// ── Rescrape Jobs ────────────────────────────────────────────────────────
export const rescrapeJobsJob = inngest.createFunction(
  { id: "rescrape-jobs", name: "🔄 Rescrape Jobs (Continuous)", triggers: [{ cron: "0 * * * *" }] },
  async ({ step }) => {
    return await step.run("execute-rescrape-jobs", async () => {
      // Only rescrape active jobs — inactive listings are not worth the AI cost
      const oldestJobs = await db.select()
        .from(jobs)
        .where(eq(jobs.isActive, true))
        .orderBy(asc(jobs.updatedAt))
        .limit(20);

      let updatedCount = 0;

      for (const job of oldestJobs) {
        if (!job.sourceUrl) continue;
        
        try {
          const html = await fetchHtml(job.sourceUrl);
          if (html) {
            const { text } = await htmlToTextEnriched(html, job.sourceUrl);
            const extracted = await extractJobsWithAI(text, job.sourceUrl);
            
            if (extracted && extracted.length > 0) {
              // Find best match by title
              let bestMatch = extracted[0];
              for (const ex of extracted) {
                if (ex.title.toLowerCase().includes(job.title.toLowerCase()) || job.title.toLowerCase().includes(ex.title.toLowerCase())) {
                  bestMatch = ex;
                  break;
                }
              }

              // Overwrite incorrect info, fill in nulls
              await db.update(jobs).set({
                title: bestMatch.title, // Keep it fresh
                description: bestMatch.description || job.description,
                requirements: bestMatch.requirements || job.requirements,
                jobType: bestMatch.jobType || job.jobType,
                postedDate: bestMatch.postedDate || job.postedDate,
                deadline: bestMatch.deadline || job.deadline,
                salaryMin: bestMatch.salaryMin ? bestMatch.salaryMin.toString() : job.salaryMin,
                salaryMax: bestMatch.salaryMax ? bestMatch.salaryMax.toString() : job.salaryMax,
                salaryCurrency: bestMatch.salaryCurrency || job.salaryCurrency,
                sourceUrl: bestMatch.sourceUrl || job.sourceUrl,
                updatedAt: new Date()
              }).where(eq(jobs.id, job.id));
              updatedCount++;
              continue;
            }
          }
        } catch (e: unknown) {
          const err = e as { code?: string; message?: string };
          if (err.code === '23505') {
            // The freshly-scraped sourceUrl conflicts with another row — this record
            // is a duplicate that snuck in. Skip the update; DO NOT delete the record
            // as that is data-destructive and the record itself may still be valid.
            console.warn(`[rescrape-jobs] sourceUrl conflict (23505) updating job ${job.id}. Skipping update.`);
            // Bump updatedAt so this job doesn't get picked up immediately again
            await db.update(jobs).set({ updatedAt: new Date() }).where(eq(jobs.id, job.id));
            continue;
          }
          console.error(`Error rescraping job ${job.id}:`, e);
        }

        // Even if it failed to extract, bump updatedAt so we don't get stuck in a loop
        await db.update(jobs).set({ updatedAt: new Date() }).where(eq(jobs.id, job.id));
      }

      return { message: `Rescraped and refreshed ${updatedCount} out of ${oldestJobs.length} jobs.` };
    });
  }
);

// ── Rescrape Tenders ─────────────────────────────────────────────────────
export const rescrapeTendersJob = inngest.createFunction(
  { id: "rescrape-tenders", name: "🔄 Rescrape Tenders (Continuous)", triggers: [{ cron: "15 * * * *" }] },
  async ({ step }) => {
    return await step.run("execute-rescrape-tenders", async () => {
      // Only rescrape open tenders — closed/awarded tenders are not worth the AI cost
      const oldestTenders = await db.select()
        .from(tenders)
        .where(eq(tenders.status, "open"))
        .orderBy(asc(tenders.updatedAt))
        .limit(20);

      let updatedCount = 0;

      for (const tender of oldestTenders) {
        if (!tender.sourceUrl) continue;
        
        try {
          const html = await fetchHtml(tender.sourceUrl);
          if (html) {
            const { text } = await htmlToTextEnriched(html, tender.sourceUrl);
            const extracted = await extractTendersWithAI(text, tender.sourceUrl);
            
            if (extracted && extracted.length > 0) {
              const bestMatch = extracted[0]; // Tenders usually have 1 per page

              await db.update(tenders).set({
                title: bestMatch.title,
                referenceNo: bestMatch.referenceNo || tender.referenceNo,
                description: bestMatch.description || tender.description,
                contractingAuthority: bestMatch.contractingAuthority || tender.contractingAuthority,
                category: bestMatch.category || tender.category,
                deadline: bestMatch.deadline || tender.deadline,
                budget: bestMatch.budget ? bestMatch.budget.toString() : tender.budget,
                currency: bestMatch.currency || tender.currency,
                sourceUrl: bestMatch.sourceUrl || tender.sourceUrl,
                updatedAt: new Date()
              }).where(eq(tenders.id, tender.id));
              updatedCount++;
              continue;
            }
          }
        } catch (e: unknown) {
          const err = e as { code?: string; message?: string };
          if (err.code === '23505') {
            // sourceUrl conflict during update — skip rather than deleting a valid record
            console.warn(`[rescrape-tenders] sourceUrl conflict (23505) updating tender ${tender.id}. Skipping update.`);
            await db.update(tenders).set({ updatedAt: new Date() }).where(eq(tenders.id, tender.id));
            continue;
          }
          console.error(`Error rescraping tender ${tender.id}:`, e);
        }

        await db.update(tenders).set({ updatedAt: new Date() }).where(eq(tenders.id, tender.id));
      }

      return { message: `Rescraped and refreshed ${updatedCount} out of ${oldestTenders.length} tenders.` };
    });
  }
);

// ── Rescrape Compliance ──────────────────────────────────────────────────
export const rescrapeComplianceJob = inngest.createFunction(
  { id: "rescrape-compliance", name: "🔄 Rescrape Compliance (Continuous)", triggers: [{ cron: "30 * * * *" }] },
  async ({ step }) => {
    return await step.run("execute-rescrape-compliance", async () => {
      const oldestCompliance = await db.select()
        .from(complianceRequirements)
        .where(and(
          isNotNull(complianceRequirements.sourceUrl),
          eq(complianceRequirements.isActive, true),
        ))
        .orderBy(asc(complianceRequirements.updatedAt))
        .limit(20);

      let updatedCount = 0;

      for (const comp of oldestCompliance) {
        if (!comp.sourceUrl) continue;
        
        try {
          const html = await fetchHtml(comp.sourceUrl);
          if (html) {
            const { text } = await htmlToTextEnriched(html, comp.sourceUrl);
            const extracted = await extractComplianceWithAI(text, comp.sourceUrl);
            
            if (extracted && extracted.length > 0) {
              const bestMatch = extracted[0]; 
              
              await db.update(complianceRequirements).set({
                title: bestMatch.title || comp.title,
                description: bestMatch.description || comp.description,
                category: bestMatch.category || comp.category,
                issuingAuthority: bestMatch.issuingAuthority || comp.issuingAuthority,
                resourceType: bestMatch.resourceType || comp.resourceType,
                sourceUrl: bestMatch.sourceUrl || comp.sourceUrl,
                updatedAt: new Date(),
                lastVerifiedAt: new Date(),
              }).where(eq(complianceRequirements.id, comp.id));
              updatedCount++;
              continue;
            }
          }
        } catch (e: unknown) {
          const err = e as { code?: string; message?: string };
          if (err.code === '23505') {
            // sourceUrl conflict during update — skip rather than deleting a valid record
            console.warn(`[rescrape-compliance] sourceUrl conflict (23505) updating compliance ${comp.id}. Skipping update.`);
            await db.update(complianceRequirements).set({ updatedAt: new Date() }).where(eq(complianceRequirements.id, comp.id));
            continue;
          }
          console.error(`Error rescraping compliance ${comp.id}:`, e);
        }

        await db.update(complianceRequirements).set({ updatedAt: new Date() }).where(eq(complianceRequirements.id, comp.id));
      }

      return { message: `Rescraped and refreshed ${updatedCount} out of ${oldestCompliance.length} compliance records.` };
    });
  }
);
