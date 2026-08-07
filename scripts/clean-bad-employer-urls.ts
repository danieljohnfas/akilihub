import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { isEmployerUrl } from '../src/lib/sources/aggregators';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const conn = postgres(dbUrl, {
  ssl: dbUrl.includes('supabase.com') || dbUrl.includes('neon.tech') || dbUrl.includes('pooler.supabase.com') ? 'require' : false,
  max: 5,
});
const db = drizzle(conn);

async function cleanBadEmployerUrls() {
  console.log('🧹 Validating all employer_urls in jobs and tenders against strict isEmployerUrl rules...\n');

  // Check jobs
  const jobsRecords = await db.execute(sql`
    SELECT id, employer_url
    FROM jobs
    WHERE employer_url IS NOT NULL;
  `);

  let invalidJobs = 0;
  for (const row of jobsRecords) {
    const url = row.employer_url as string;
    if (!isEmployerUrl(url)) {
      invalidJobs++;
      await db.execute(sql`
        UPDATE jobs
        SET employer_url = NULL,
            is_aggregator_source = true,
            updated_at = NOW()
        WHERE id = ${row.id as string};
      `);
    }
  }

  console.log(`Cleaned ${invalidJobs} invalid employer_url records in jobs.`);

  // Check tenders
  const tendersRecords = await db.execute(sql`
    SELECT id, employer_url
    FROM tenders
    WHERE employer_url IS NOT NULL;
  `);

  let invalidTenders = 0;
  for (const row of tendersRecords) {
    const url = row.employer_url as string;
    if (!isEmployerUrl(url)) {
      invalidTenders++;
      await db.execute(sql`
        UPDATE tenders
        SET employer_url = NULL,
            is_aggregator_source = true,
            updated_at = NOW()
        WHERE id = ${row.id as string};
      `);
    }
  }

  console.log(`Cleaned ${invalidTenders} invalid employer_url records in tenders.`);
  process.exit(0);
}

cleanBadEmployerUrls().catch(e => {
  console.error(e);
  process.exit(1);
});
