import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { lt, and, eq } from "drizzle-orm";

async function main() {
  const now = new Date();
  
  const updated = await db
    .update(jobs)
    .set({
      isActive: false,
      updatedAt: now,
    })
    .where(
      and(
        eq(jobs.isActive, true),
        lt(jobs.deadline, now)
      )
    )
    .returning({ id: jobs.id });

  console.log(`[Freshness] Closed ${updated.length} expired jobs.`);
  process.exit(0);
}

main().catch(console.error);
