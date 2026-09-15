import { db } from './src/lib/db/client';
import { jobs } from './src/lib/db/schema/jobs';
import { eq } from 'drizzle-orm';

async function update() {
  console.log("Updating active jobs...");
  await db.update(jobs).set({ isActive: true }).where(eq(jobs.isActive, false));
  console.log("Done.");
  process.exit(0);
}

update();
