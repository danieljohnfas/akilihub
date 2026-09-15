import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
async function main() {
  const result = await db.select().from(jobs);
  console.log('Total jobs:', result.length);
  process.exit(0);
}
main();
