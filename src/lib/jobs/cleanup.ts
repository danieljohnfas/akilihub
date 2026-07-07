import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { tenders } from '@/lib/db/schema/tenders';
import { lt, and, eq } from 'drizzle-orm';

async function cleanupExpiredJobs() {
  const result = await db
    .update(jobs)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(jobs.isActive, true),
        lt(jobs.deadline, new Date())
      )
    );
  console.log(`[cleanup] Archived expired jobs.`);
  return result;
}

async function cleanupExpiredTenders() {
  const result = await db
    .update(tenders)
    .set({ status: 'closed', updatedAt: new Date() })
    .where(
      and(
        eq(tenders.status, 'open'),
        lt(tenders.deadline, new Date())
      )
    );
  console.log(`[cleanup] Closed expired tenders.`);
  return result;
}

export async function runCleanup() {
  console.log('🧹 Running data lifecycle cleanup...');
  await cleanupExpiredJobs();
  await cleanupExpiredTenders();
  console.log('✅ Cleanup complete.');
}

// Run directly
if (require.main === module || process.argv[1]?.endsWith('cleanup.ts')) {
  runCleanup().then(() => process.exit(0)).catch(console.error);
}
