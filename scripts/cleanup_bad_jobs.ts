import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { or, ilike } from 'drizzle-orm';

async function run() {
    console.log('Cleaning up ALL bad titles and new aggregators...');
    const res = await db.update(jobs)
      .set({ isActive: false, isAggregatorSource: true })
      .where(
        or(
          ilike(jobs.title, '[LINK]%'),
          ilike(jobs.title, '[IMAGE:%'),
          ilike(jobs.title, '%Find The Job That Fits Your Life%'),
          ilike(jobs.title, 'Professional Opportunity%'),
          ilike(jobs.title, '%career portal%'),
          ilike(jobs.title, '%Skip to content%'),
          ilike(jobs.employerUrl, '%ethiopianjobs.net%'),
          ilike(jobs.employerUrl, '%mysarkarinaukri.com%'),
          ilike(jobs.employerUrl, '%govtjobguru.in%'),
          ilike(jobs.employerUrl, '%africatraininginstitute.org%'),
          ilike(jobs.employerUrl, '%unvacancies.org%'),
          ilike(jobs.employerUrl, '%unjoblink.org%'),
          ilike(jobs.employerUrl, '%googleblog.com%'),
          ilike(jobs.employerUrl, '%plus.google.com%')
        )
      ).returning({id: jobs.id, title: jobs.title, employerUrl: jobs.employerUrl});
    console.log('Deactivated jobs:', res.length);
    process.exit(0);
}
run();
