import { db } from './src/lib/db/client';
import { jobs } from './src/lib/db/schema/jobs';
import { eq } from 'drizzle-orm';

async function checkJob() {
  const id = 'dc80fb7f-c887-4871-8a44-cc558a050c79';
  const res = await db.select().from(jobs).where(eq(jobs.id, id));
  if (res.length > 0) {
    const job = res[0];
    console.log(JSON.stringify(job, null, 2));
  } else {
    console.log('JOB NOT FOUND');
  }
  process.exit(0);
}
checkJob();
