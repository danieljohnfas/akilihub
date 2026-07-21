import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from '@/lib/db/client';
import { tenders } from '@/lib/db/schema/tenders';
import { isNull } from 'drizzle-orm';

async function main() {
  const allTenders = await db.select({
    id: tenders.id,
    publishedAt: tenders.publishedAt,
    deadline: tenders.deadline,
    createdAt: tenders.createdAt
  }).from(tenders);

  let nullPublished = 0;
  let fakePublished = 0;

  for (const t of allTenders) {
    if (!t.publishedAt) nullPublished++;
    else if (t.createdAt) {
      const diffMs = Math.abs(t.publishedAt.getTime() - t.createdAt.getTime());
      if (diffMs < 5 * 60 * 1000) {
        fakePublished++;
      }
    }
  }

  console.log(`Total Tenders: ${allTenders.length}`);
  console.log(`Tenders with NULL publishedAt: ${nullPublished}`);
  console.log(`Tenders with fake publishedAt (== createdAt): ${fakePublished}`);
  
  process.exit(0);
}

main().catch(console.error);
