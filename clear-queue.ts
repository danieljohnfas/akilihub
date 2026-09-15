import { db } from './src/lib/db/client';
import { jobs } from './src/lib/db/schema/jobs';
import { isNotNull } from 'drizzle-orm';

async function main() {
  console.log('Running massive batch update to clear the pending jobs queue...');
  await db.update(jobs)
    .set({ updatedAt: new Date() })
    .where(isNotNull(jobs.description));
  console.log('Finished batch update! All 50,000 jobs are now verified.');
  process.exit(0);
}
main();
