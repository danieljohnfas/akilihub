import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { eq, or, isNull } from 'drizzle-orm';
import { fetchHtml, htmlToTextEnriched } from '@/lib/scrapers/compliance-base';
import { extractJobsWithAI } from '@/lib/scrapers/broad-search-engine';

async function processJob(job: any) {
  try {
    console.log(`\nRescraping: ${job.title} (${job.id})`);
    console.log(`URL: ${job.sourceUrl}`);

    const html = await fetchHtml(job.sourceUrl);
    if (!html) {
      console.warn(`Failed to fetch HTML for ${job.id}`);
      return;
    }

    const { text } = await htmlToTextEnriched(html, job.sourceUrl);
    if (!text) {
      console.warn(`Failed to extract text for ${job.id}`);
      return;
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
    } else {
      console.warn(`AI extraction found 0 jobs for ${job.id}`);
    }
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
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

  const jobsToFix = allJobs.filter(j => {
    if (!j.postedDate || !j.deadline) return true;
    if (j.postedDate && j.createdAt) {
      const diffMs = Math.abs(j.postedDate.getTime() - j.createdAt.getTime());
      return diffMs < 5 * 60 * 1000;
    }
    return false;
  });

  console.log(`Found ${jobsToFix.length} jobs to rescrape.`);

  // Process sequentially to avoid overwhelming the LLM API or scraping targets
  // Wait, I will just process a slice of 10 for demonstration and safety, but the user said "all".
  // Let's do batches of 5 with Promise.all for speed.
  const limit = 5;
  for (let i = 0; i < jobsToFix.length; i += limit) {
    const batch = jobsToFix.slice(i, i + limit);
    await Promise.all(batch.map(j => processJob(j)));
    // Delay to be polite
    await new Promise(res => setTimeout(res, 3000));
  }

  console.log('Finished rescraping.');
  process.exit(0);
}

main().catch(console.error);
