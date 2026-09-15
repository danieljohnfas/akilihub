import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { ilike, or } from 'drizzle-orm';
async function main() {
  await db.delete(jobs).where(
    or(
      ilike(jobs.title, '%Vacancies%'),
      ilike(jobs.title, '%Opportunities%'),
      ilike(jobs.sourceUrl, '%#%')
    )
  );
  console.log('Purged aggregator-level jobs');
  process.exit(0);
}
main();
