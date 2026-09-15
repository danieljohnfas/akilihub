import { db } from './src/lib/db/client';
import { jobs } from './src/lib/db/schema/jobs';
import { count, eq, and, isNull, gt, or } from 'drizzle-orm';
async function test() {
  try {
    const res = await db.select({ value: count() }).from(jobs).where(
      and(eq(jobs.isActive, true), or(isNull(jobs.deadline), gt(jobs.deadline, new Date())))
    );
    console.log('Result:', res);
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit(0);
}
test();
