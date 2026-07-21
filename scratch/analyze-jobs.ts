import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { isNull, sql } from 'drizzle-orm';

async function main() {
  const allJobs = await db.select({
    id: jobs.id,
    postedDate: jobs.postedDate,
    deadline: jobs.deadline,
    createdAt: jobs.createdAt
  }).from(jobs);

  let nullPosted = 0;
  let nullDeadline = 0;
  let fakePosted = 0; // postedDate roughly equals createdAt

  for (const j of allJobs) {
    if (!j.postedDate) nullPosted++;
    if (!j.deadline) nullDeadline++;
    if (j.postedDate && j.createdAt) {
      const diffMs = Math.abs(j.postedDate.getTime() - j.createdAt.getTime());
      // If within 5 minutes, it's definitely a fake fallback date
      if (diffMs < 5 * 60 * 1000) {
        fakePosted++;
      }
    }
  }

  console.log(`Total Jobs: ${allJobs.length}`);
  console.log(`Jobs with NULL postedDate: ${nullPosted}`);
  console.log(`Jobs with fake postedDate (== createdAt): ${fakePosted}`);
  console.log(`Jobs with NULL deadline: ${nullDeadline}`);

  process.exit(0);
}

main().catch(console.error);
