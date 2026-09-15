import { db } from './src/lib/db/client';
import { jobs } from './src/lib/db/schema/jobs';
import { inArray } from 'drizzle-orm';

function calculateSeoScore(job: any): number {
    let score = 0;
    if (job.companyName && job.companyName.toLowerCase() !== 'unknown') score += 10;
    if (job.title) score += 10;
    if (job.regionId) score += 10;
    if (job.deadline && new Date(job.deadline) > new Date()) score += 10;
    if (job.salaryMin || job.salaryMax) score += 8;
    if (job.deadline) score += 8;
    if (job.description && job.description.length > 500) score += 5;
    if (job.sourceUrl && !job.sourceUrl.includes('google.com')) score += 5;
    if (job.requirements && job.requirements.length > 0) score += 5;
    return score;
}

async function run() {
  console.log("Fetching all jobs...");
  const allJobs = await db.select().from(jobs);
  
  let toDeactivate = [];
  
  for (const job of allJobs) {
      const score = calculateSeoScore(job);
      if (score < 50) {
          toDeactivate.push(job.id);
      }
  }
  
  console.log(`Found ${toDeactivate.length} jobs to deactivate out of ${allJobs.length} total jobs.`);
  
  const batchSize = 100;
  for (let i = 0; i < toDeactivate.length; i += batchSize) {
      const batchIds = toDeactivate.slice(i, i + batchSize);
      await db.update(jobs).set({ isActive: false }).where(inArray(jobs.id, batchIds));
      console.log(`Deactivated ${Math.min(i + batchSize, toDeactivate.length)} / ${toDeactivate.length}`);
  }
  
  console.log("Done.");
  process.exit(0);
}

run();
