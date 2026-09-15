import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { inArray } from 'drizzle-orm';
async function main() {
  const ids = ['605adf44-6817-4140-ae4d-0a1ccdaf294a', '94e5dad8-1cca-4a4d-b167-0e30718a589d'];
  await db.delete(jobs).where(inArray(jobs.id, ids));
  console.log(Purged  bad jobs.);
  process.exit(0);
}
main();