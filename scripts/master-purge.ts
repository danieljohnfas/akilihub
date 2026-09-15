import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { tenders } from '../src/lib/db/schema/tenders';
import { businesses } from '../src/lib/db/schema/businesses';
import { like, or, eq } from 'drizzle-orm';

async function main() {
  console.log('[MasterPurge] Sweeping the entire database for fake/synthetic placeholder data...');

  // 1. Purge Fake Jobs
  console.log('Purging fake Jobs...');
  const deletedJobs = await db.delete(jobs)
    .where(
      or(
        like(jobs.description, '%Detailed job description is available%'),
        like(jobs.sourceUrl, '%linkedin.com/jobs/view/%')
      )
    )
    .returning({ id: jobs.id });
  console.log(`Deleted ${deletedJobs.length} synthetic/placeholder jobs.`);

  // 2. Purge Fake Tenders
  console.log('Purging fake Tenders...');
  const deletedTenders = await db.delete(tenders)
    .where(
      or(
        like(tenders.sourceUrl, '%inaproc.id/tender/0.%'),
        like(tenders.description, '%Public procurement contract for the provision of essential%')
      )
    )
    .returning({ id: tenders.id });
  console.log(`Deleted ${deletedTenders.length} synthetic/placeholder tenders.`);

  console.log('[MasterPurge] Database cleanup complete. Only authentic data remains.');
  process.exit(0);
}

main();
