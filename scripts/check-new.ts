import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { desc } from 'drizzle-orm';
async function main() {
  const allJobs = await db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(5);
  console.log('Total fetched: ' + allJobs.length);
  allJobs.forEach(j => console.log('- ' + j.title + ' at ' + j.companyName));
  process.exit(0);
}
main();