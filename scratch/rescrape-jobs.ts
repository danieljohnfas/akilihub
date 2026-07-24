import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { eq, or, isNull } from 'drizzle-orm';
import { fetchHtml, htmlToTextEnriched } from '@/lib/scrapers/compliance-base';
import { extractJobsWithAI } from '@/lib/scrapers/broad-search-engine';

async function processJob(job: any): Promise<boolean> {
  try {
    console.log(`\nRescraping: ${job.title} (${job.id})`);
    console.log(`URL: ${job.sourceUrl}`);

    const html = await fetchHtml(job.sourceUrl);
    if (!html) {
      console.warn(`Failed to fetch HTML for ${job.id}`);
      return false;
    }

    const { text } = await htmlToTextEnriched(html, job.sourceUrl);
    if (!text) {
      console.warn(`Failed to extract text for ${job.id}`);
      return false;
    }

    // AI Extraction
    const extracted = await extractJobsWithAI(text, job.sourceUrl);
    
    if (extracted && extracted.length > 0) {
      // Find the closest matching job title or just take the first one
      const bestMatch = extracted[0]; // Assuming single job per page usually
      
      const newPosted = bestMatch.postedDate || null;
      const newDeadline = bestMatch.deadline || null;

      console.log(`Found Dates -> Posted: ${newPosted}, Deadline: ${newDeadline}`);

      await db.update(jobs)
        .set({
          postedDate: newPosted,
          deadline: newDeadline
        })
        .where(eq(jobs.id, job.id));
      
      console.log(`Updated ${job.id} successfully.`);
      return true; // Success!
    } else {
      console.warn(`AI extraction found 0 jobs for ${job.id}`);
      return false;
    }
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    return false;
  }
}

async function main() {
  const allJobs = await db.select({
    id: jobs.id,
    title: jobs.title,
    sourceUrl: jobs.sourceUrl,
    postedDate: jobs.postedDate,
    deadline: jobs.deadline,
    createdAt: jobs.createdAt
  }).from(jobs);

  let jobsToFix = allJobs.filter(j => {
    if (!j.postedDate || !j.deadline) return true;
    if (j.postedDate && j.createdAt) {
      const diffMs = Math.abs(j.postedDate.getTime() - j.createdAt.getTime());
      return diffMs < 5 * 60 * 1000;
    }
    return false;
  });

  const maxPasses = 5;
  let pass = 1;

  while (jobsToFix.length > 0 && pass <= maxPasses) {
    console.log(`\n===========================================`);
    console.log(`--- PASS ${pass} of ${maxPasses} ---`);
    console.log(`Found ${jobsToFix.length} jobs to rescrape.`);
    console.log(`===========================================\n`);

    const failedJobs: any[] = [];
    const limit = 5;

    for (let i = 0; i < jobsToFix.length; i += limit) {
      const batch = jobsToFix.slice(i, i + limit);
      
      const results = await Promise.all(batch.map(j => processJob(j)));
      
      // Collect the ones that failed
      for (let j = 0; j < results.length; j++) {
        if (!results[j]) {
          failedJobs.push(batch[j]);
        }
      }
      
      // Delay to be polite and avoid rate limits
      await new Promise(res => setTimeout(res, 5000));
    }

    jobsToFix = failedJobs;
    
    if (jobsToFix.length > 0) {
      console.log(`\nPass ${pass} finished. ${jobsToFix.length} jobs failed.`);
      pass++;
      if (pass <= maxPasses) {
        console.log(`Waiting 30 seconds before next pass to let AI limiters cool down...\n`);
        await new Promise(res => setTimeout(res, 30000));
      }
    }
  }

  if (jobsToFix.length > 0) {
    console.log(`\nFinished all ${maxPasses} passes. ${jobsToFix.length} jobs could not be resolved (likely dead URLs or permanent AI extraction failures).`);
  } else {
    console.log(`\nSuccessfully rescraped and updated all jobs!`);
  }
  
  process.exit(0);
}

main().catch(console.error);
