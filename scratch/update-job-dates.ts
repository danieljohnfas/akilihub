import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { eq } from 'drizzle-orm';

async function main() {
  await db.update(jobs)
    .set({
      postedDate: new Date('2025-11-19T00:00:00Z'),
      deadline: new Date('2025-12-03T23:59:59Z')
    })
    .where(eq(jobs.id, 'beeaa86d-c903-4bb4-b405-e61e48dfa33c'));
  
  console.log('Successfully updated dates for job beeaa86d-c903-4bb4-b405-e61e48dfa33c');
  process.exit(0);
}

main().catch(console.error);
