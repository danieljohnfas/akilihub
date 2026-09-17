import 'dotenv/config';
import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { like } from 'drizzle-orm';

async function main() {
  console.log("Removing hallucinated jobs...");
  const result = await db.delete(jobs).where(like(jobs.sourceUrl, '%/careers/job-%'));
  console.log(`Successfully removed hallucinated jobs.`);
}

main().catch(console.error).finally(() => process.exit(0));
