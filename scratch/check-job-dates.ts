import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '@/lib/db/client';
import { jobs } from '@/lib/db/schema/jobs';
import { eq } from 'drizzle-orm';

async function main() {
  const result = await db.select({
    id: jobs.id,
    title: jobs.title,
    company: jobs.companyName,
    posted: jobs.postedDate,
    deadline: jobs.deadline,
    createdAt: jobs.createdAt,
    sourceUrl: jobs.sourceUrl
  }).from(jobs).where(eq(jobs.id, 'beeaa86d-c903-4bb4-b405-e61e48dfa33c'));
  
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch(console.error);
