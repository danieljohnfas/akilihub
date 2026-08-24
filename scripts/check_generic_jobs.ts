import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { eq, or, like, ilike } from 'drizzle-orm';
async function run() {
  const res = await db.select({id: jobs.id, title: jobs.title, url: jobs.sourceUrl}).from(jobs).where(or(ilike(jobs.title, '%Find The Job That Fits Your Life%'), ilike(jobs.title, '%Professional Opportunity%'), ilike(jobs.title, '%career portal%'), ilike(jobs.title, '%skip to%')));
  console.log('Found', res.length, 'generic jobs');
  console.log(res);
  process.exit(0);
}
run();
