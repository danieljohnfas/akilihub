import { db } from './src/lib/db/client';
import { jobs } from './src/lib/db/schema/jobs';
import { isNull, or, sql } from 'drizzle-orm';

async function main() {
  const count = await db.select({ count: sql`count(*)` }).from(jobs).where(or(isNull(jobs.sector), isNull(jobs.experienceLevel)));
  console.log('Jobs still missing sector/experience:', count);
  process.exit(0);
}
main();
