import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema/jobs";
import { eq, or, ilike } from "drizzle-orm";
import { fetchHtml, htmlToTextEnriched } from "@/lib/scrapers/compliance-base";
import { extractJobsWithAI } from "@/lib/scrapers/broad-search-engine";
import { classifySourceUrl } from "@/lib/sources/employer-resolver";

async function main() {
  console.log("[reprocess-fallback-jobs] Starting retroactive AI extraction...");

  // 1. Find all affected jobs
  // This includes any explicitly flagged OR any where description contains the Trafilatura link artifacts
  const affectedJobs = await db
    .select()
    .from(jobs)
    .where(
      or(
        eq(jobs.needsAiExtraction, true),
        ilike(jobs.description, "%[LINK]%")
      )
    );

  console.log(`[reprocess-fallback-jobs] Found ${affectedJobs.length} jobs needing AI reprocessing.`);

  let successCount = 0;
  let failureCount = 0;

  for (const job of affectedJobs) {
    console.log(`\n[reprocess-fallback-jobs] Reprocessing job ID: ${job.id} - Source: ${job.sourceUrl}`);
    
    try {
      // 2. Fetch full raw HTML and convert to enriched text
      const html = await fetchHtml(job.sourceUrl);
      if (!html) {
        console.warn(`[reprocess-fallback-jobs] Failed to fetch HTML for ${job.sourceUrl}`);
        failureCount++;
        continue;
      }

      const { text } = await htmlToTextEnriched(html, job.sourceUrl);

      // 3. Extract with AI
      const extractedJobs = await extractJobsWithAI(text, job.sourceUrl);

      // If we got valid results back and it didn't fall back again
      if (extractedJobs.length > 0) {
        // We might get multiple jobs from one page.
        // For simplicity and to fix this specific record, we'll take the first one
        // and update the existing DB row, instead of deleting and inserting new ones.
        const cleanJob = extractedJobs[0];

        // If the AI successfully extracted it, cleanJob.needsAiExtraction should be undefined/false
        if (!cleanJob.needsAiExtraction) {
          const { isAggregatorSource, quickEmployerUrl } = classifySourceUrl(cleanJob.sourceUrl);

          await db.update(jobs)
            .set({
              title: cleanJob.title,
              companyName: cleanJob.companyName || 'Unknown',
              description: cleanJob.description || 'No description',
              requirements: cleanJob.requirements,
              regionId: cleanJob.regionId,
              jobType: cleanJob.jobType,
              employerUrl: quickEmployerUrl,
              isAggregatorSource,
              postedDate: cleanJob.postedDate || job.postedDate,
              deadline: cleanJob.deadline ?? null,
              salaryMin: cleanJob.salaryMin?.toString() ?? null,
              salaryMax: cleanJob.salaryMax?.toString() ?? null,
              salaryCurrency: cleanJob.salaryCurrency ?? null,
              needsAiExtraction: false,
              updatedAt: new Date(),
            })
            .where(eq(jobs.id, job.id));

          console.log(`[reprocess-fallback-jobs] ✅ Successfully cleaned job ${job.id}: "${cleanJob.title}"`);
          successCount++;
        } else {
          console.warn(`[reprocess-fallback-jobs] ⚠️ AI extraction still failed (fallback triggered) for ${job.id}`);
          failureCount++;
        }
      } else {
        console.warn(`[reprocess-fallback-jobs] ❌ AI returned 0 jobs for ${job.id}`);
        failureCount++;
      }
    } catch (error) {
      console.error(`[reprocess-fallback-jobs] ❌ Error processing job ${job.id}:`, error);
      failureCount++;
    }

    // Polite delay
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n[reprocess-fallback-jobs] Finished. Successfully cleaned: ${successCount}. Failed: ${failureCount}.`);
}

main().catch(console.error);
