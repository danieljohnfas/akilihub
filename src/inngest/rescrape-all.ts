import { inngest } from "./client";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema/jobs";
import { tenders } from "@/lib/db/schema/tenders";
import { companyCompliance } from "@/lib/db/schema/compliance";
import { fetchHtml, htmlToTextEnriched } from "@/lib/scrapers/compliance-base";
import { extractJobsWithAI } from "@/lib/scrapers/broad-search-engine";
import { extractTendersWithAI } from "@/lib/scrapers/broad-search-engine-tenders";
import { extractComplianceWithAI } from "@/lib/scrapers/broad-search-engine-compliance";
import { eq, isNotNull, asc } from "drizzle-orm";

// ── Rescrape Jobs ────────────────────────────────────────────────────────
export const rescrapeJobsJob = inngest.createFunction(
  { id: "rescrape-jobs", name: "🔄 Rescrape Jobs (Continuous)", triggers: [{ cron: "0 * * * *" }] },
  async ({ step }) => {
    return await step.run("execute-rescrape-jobs", async () => {
      // Get the 5 oldest updated jobs
      const oldestJobs = await db.select()
        .from(jobs)
        .orderBy(asc(jobs.updatedAt))
        .limit(5);

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
                salaryMin: bestMatch.salaryMin || job.salaryMin,
                salaryMax: bestMatch.salaryMax || job.salaryMax,
                salaryCurrency: bestMatch.salaryCurrency || job.salaryCurrency,
                updatedAt: new Date()
              }).where(eq(jobs.id, job.id));
              updatedCount++;
              continue;
            }
          }
        } catch (e) {
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
      const oldestTenders = await db.select()
        .from(tenders)
        .orderBy(asc(tenders.updatedAt))
        .limit(5);

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
                referenceNumber: bestMatch.referenceNumber || tender.referenceNumber,
                scope: bestMatch.scope || tender.scope,
                requirements: bestMatch.requirements || tender.requirements,
                publishedAt: bestMatch.publishedAt || tender.publishedAt,
                deadline: bestMatch.deadline || tender.deadline,
                estimatedValue: bestMatch.estimatedValue || tender.estimatedValue,
                updatedAt: new Date()
              }).where(eq(tenders.id, tender.id));
              updatedCount++;
              continue;
            }
          }
        } catch (e) {
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
        .from(companyCompliance)
        .where(isNotNull(companyCompliance.sourceUrl))
        .orderBy(asc(companyCompliance.updatedAt))
        .limit(5);

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
              
              await db.update(companyCompliance).set({
                registrationNumber: bestMatch.registrationNumber || comp.registrationNumber,
                registrationDate: bestMatch.registrationDate || comp.registrationDate,
                taxId: bestMatch.taxId || comp.taxId,
                status: bestMatch.status || comp.status,
                entityType: bestMatch.entityType || comp.entityType,
                updatedAt: new Date(),
                lastVerifiedAt: new Date(),
              }).where(eq(companyCompliance.id, comp.id));
              updatedCount++;
              continue;
            }
          }
        } catch (e) {
          console.error(`Error rescraping compliance ${comp.id}:`, e);
        }

        await db.update(companyCompliance).set({ updatedAt: new Date() }).where(eq(companyCompliance.id, comp.id));
      }

      return { message: `Rescraped and refreshed ${updatedCount} out of ${oldestCompliance.length} compliance records.` };
    });
  }
);
