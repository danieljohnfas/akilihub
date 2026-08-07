import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { jobs } from '../src/lib/db/schema/jobs';
import { sql, isNotNull, or, like, eq } from 'drizzle-orm';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
if (!dbUrl) {
  console.error("DATABASE_URL is missing!");
  process.exit(1);
}

const isCloudDb = dbUrl.includes('supabase.com') || dbUrl.includes('neon.tech') || dbUrl.includes('pooler.supabase.com');
const conn = postgres(dbUrl, {
  ssl: isCloudDb || process.env.NODE_ENV === 'production' ? 'require' : false,
  max: 10,
  idle_timeout: 10,
  connect_timeout: 10,
  prepare: false,
});
const db = drizzle(conn);

const JUNK_OR_AGGREGATOR_PATTERNS = [
  // Social share links
  '%wa.me%',
  '%whatsapp.com%',
  '%facebook.com%',
  '%x.com%',
  '%twitter.com%',
  '%t.me%',
  '%pinterest.com%',
  '%linkedin.com/sharing%',
  '%linkedin.com/shareArticle%',

  // Cookie & Policy widgets
  '%iubenda.com%',
  '%cookiebot.com%',
  '%termly.io%',
  '%onetrust.com%',

  // Job Aggregators incorrectly stored as employerUrl
  '%myjobmagghana.com%',
  '%myjobmag.co.ke%',
  '%myjobmag.com%',
  '%ngojobsinafrica.com%',
  '%africareers.net%',
  '%alljobspo.com%',
  '%geezjobs.com%',
  '%ethiopianreporterjobs.com%',
  '%jobwebrwanda.com%',
  '%jobwebkenya.com%',
  '%jobinrwanda.com%',
  '%ethio-jobs.net.et%',
  '%ethiongojobs.com%',
  '%ajiriwa.net%',
  '%zoomtanzania.net%',
  '%macalindoon.online%',
  '%kazibure.com%',
  '%kenyajob.com%',
  '%jobsearchkenya.com%',
  '%brightermonday.co.ke%',
  '%brightermonday.co.ug%',
  '%brightermonday.co.tz%',
  '%fuzu.com%',
  '%reliefweb.int%',
  '%unjobs.org%',
  '%glassdoor.com%',
  '%indeed.com%',
  '%shortlist.net%',
  '%cvmkr.com%',
];

async function runSanitization() {
  console.log('====================================================');
  console.log('🧹 SANITIZING JOBS EMPLOYER URLS IN DATABASE');
  console.log('====================================================\n');

  // Count total jobs with employer_url
  const [totalBefore] = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobs)
    .where(isNotNull(jobs.employerUrl));

  console.log(`Total jobs currently with employer_url: ${totalBefore.count}`);

  let totalNullified = 0;

  for (const pattern of JUNK_OR_AGGREGATOR_PATTERNS) {
    const matching = await db
      .select({ id: jobs.id, employerUrl: jobs.employerUrl })
      .from(jobs)
      .where(like(jobs.employerUrl, pattern));

    if (matching.length > 0) {
      console.log(`Matching pattern "${pattern}": ${matching.length} rows`);
      
      await db
        .update(jobs)
        .set({ employerUrl: null })
        .where(like(jobs.employerUrl, pattern));

      totalNullified += matching.length;
    }
  }

  // Also nullify any anchor fragments or localhost in employerUrl
  const anchorOrLocal = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(or(like(jobs.employerUrl, '%#%'), like(jobs.employerUrl, '%localhost%'), like(jobs.employerUrl, '%example.com%')));

  if (anchorOrLocal.length > 0) {
    console.log(`Matching anchor/invalid fragments: ${anchorOrLocal.length} rows`);
    await db
      .update(jobs)
      .set({ employerUrl: null })
      .where(or(like(jobs.employerUrl, '%#%'), like(jobs.employerUrl, '%localhost%'), like(jobs.employerUrl, '%example.com%')));
    totalNullified += anchorOrLocal.length;
  }

  const [totalAfter] = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobs)
    .where(isNotNull(jobs.employerUrl));

  console.log(`\n====================================================`);
  console.log(`✅ SANITIZATION COMPLETE`);
  console.log(`   - Rows sanitized (employer_url set to NULL): ${totalNullified}`);
  console.log(`   - Valid direct employer URLs remaining:     ${totalAfter.count}`);
  console.log(`====================================================`);
}

runSanitization()
  .catch(console.error)
  .finally(async () => {
    await conn.end();
  });
