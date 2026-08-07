import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const conn = postgres(dbUrl, {
  ssl: dbUrl.includes('supabase.com') || dbUrl.includes('neon.tech') || dbUrl.includes('pooler.supabase.com') ? 'require' : false,
  max: 5,
});
const db = drizzle(conn);

async function analyzeJobsAndTenders() {
  const [jobStats] = await db.execute(sql`
    SELECT
      count(*)::int as total,
      count(CASE WHEN employer_url IS NOT NULL THEN 1 END)::int as with_employer_url,
      count(CASE WHEN employer_url IS NULL THEN 1 END)::int as null_employer_url,
      count(CASE WHEN is_aggregator_source = true THEN 1 END)::int as flagged_aggregators
    FROM jobs;
  `);

  const [tenderStats] = await db.execute(sql`
    SELECT
      count(*)::int as total,
      count(CASE WHEN employer_url IS NOT NULL THEN 1 END)::int as with_employer_url,
      count(CASE WHEN employer_url IS NULL THEN 1 END)::int as null_employer_url
    FROM tenders;
  `);

  console.log('=== JOBS STATS ===');
  console.log(jobStats);
  console.log('\n=== TENDERS STATS ===');
  console.log(tenderStats);

  // Group by domain for jobs without employer_url or where employer_url is null
  const topNullDomains = await db.execute(sql`
    SELECT 
      substring(source_url from 'https?://([^/]+)') as domain,
      count(*)::int as count
    FROM jobs
    WHERE employer_url IS NULL
    GROUP BY domain
    ORDER BY count DESC
    LIMIT 25;
  `);

  console.log('\n=== TOP 25 UNRESOLVED DOMAINS FOR JOBS ===');
  console.table(topNullDomains);

  process.exit(0);
}

analyzeJobsAndTenders();
