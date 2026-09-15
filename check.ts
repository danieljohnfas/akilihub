import { db } from './src/lib/db/client';
import { jobs } from './src/lib/db/schema/jobs';
import { eq, and, count } from 'drizzle-orm';

async function run() {
  const result = await db.select({ value: count() }).from(jobs).where(and(eq(jobs.isActive, true), eq(jobs.isAggregatorSource, false)));
  console.log('Active Jobs:', result[0].value);
  process.exit(0);
}
run();
