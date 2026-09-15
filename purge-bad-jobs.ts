import { db } from './src/lib/db';
import { jobs } from './src/lib/schema';
import { eq } from 'drizzle-orm';

async function purge() {
  // Find jobs that don't adhere
  const deleted = await db.delete(jobs).where(eq(jobs.companyName, 'Unknown')).returning();
  console.log('Purged', deleted.length, 'jobs that failed AI extraction (Unknown company).');
  process.exit(0);
}
purge();
