// SAFETY: this script deletes data. It refuses to run unless invoked with --apply,
// so a stray `tsx scripts/<name>` can never wipe rows. Read the SQL below first, and take a backup.
if (!process.argv.includes('--apply')) {
  console.error('Refusing to run: this script deletes data. Re-run with --apply after reviewing it.');
  process.exit(1);
}

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
