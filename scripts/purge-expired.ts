import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { lt } from 'drizzle-orm';
async function main() {
  const result = await db.delete(jobs).where(lt(jobs.deadline, new Date()));
  console.log('Purged expired jobs');
  process.exit(0);
}
main();
