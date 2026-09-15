import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { eq } from 'drizzle-orm';
async function main() {
  const deletedJobs = await db.delete(jobs).where(eq(jobs.companyName, 'Unknown')).returning({ id: jobs.id });
  console.log('Deleted ' + deletedJobs.length + ' jobs.');
  process.exit(0);
}
main();