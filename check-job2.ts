import { db } from './src/lib/db/client';
import { jobs } from './src/lib/db/schema/jobs';
import { eq } from 'drizzle-orm';

async function main() {
  const jobId = '9f4c013b-8aed-4d2f-858c-decfa3b76d7c';
  const result = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (result.length > 0) {
    const job = result[0];
    console.log('Title:', job.title);
    console.log('Company:', job.companyName);
    console.log('Sector:', job.sector);
    console.log('Job Type:', job.jobType);
    console.log('Source URL:', job.sourceUrl);
    console.log('Description length:', job.description?.length);
    console.log('Description (first 250 chars):', job.description?.substring(0, 250));
  } else {
    console.log('Job not found in database. It may have been deleted during the purge.');
  }
  process.exit(0);
}
main();
