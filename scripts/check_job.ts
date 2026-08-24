import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { eq } from 'drizzle-orm';
async function run() {
  const res = await db.select().from(jobs).where(eq(jobs.id, '53bd55fa-bc40-4e0d-ac74-fd5270169260'));
  console.log(res);
  process.exit(0);
}
run();
