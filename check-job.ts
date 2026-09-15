import { db } from './src/lib/db/client';
import { jobs } from './src/lib/db/schema/jobs';
import { eq } from 'drizzle-orm';

async function main() {
  const result = await db.select().from(jobs).where(eq(jobs.id, 'e1daa67f-15c1-46fa-baa6-531ade56112a')).limit(1);
  if (result.length > 0) {
    const job = result[0];
    console.log('Title:', job.title);
    console.log('Sector:', job.sector);
    console.log('Job Type:', job.jobType);
    console.log('Experience:', job.experienceLevel);
    console.log('Description (first 200 chars):', job.description.substring(0, 200));
  } else {
    console.log('Job not found in database.');
  }
  process.exit(0);
}
main();
