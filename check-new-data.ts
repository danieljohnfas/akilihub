import { db } from './src/lib/db';
import { jobs } from './src/lib/schema';
import { desc } from 'drizzle-orm';

async function check() {
  const latestJobs = await db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(3);
  console.log(JSON.stringify(latestJobs, null, 2));
  process.exit(0);
}
check();
