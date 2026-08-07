import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { resolveEmployerUrl } from '../src/lib/sources/employer-resolver';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const isCloudDb = dbUrl.includes('supabase.com') || dbUrl.includes('neon.tech') || dbUrl.includes('pooler.supabase.com');
const conn = postgres(dbUrl, {
  ssl: isCloudDb || process.env.NODE_ENV === 'production' ? 'require' : false,
  max: 5,
});
const db = drizzle(conn);

async function testResolution() {
  const sampleJobs = await db.execute(sql`
    SELECT id, title, company_name, source_url
    FROM jobs
    WHERE employer_url IS NULL
    ORDER BY created_at DESC
    LIMIT 30;
  `);

  console.log(`Testing resolver on ${sampleJobs.length} sample jobs...\n`);

  for (const job of sampleJobs) {
    const sUrl = job.source_url as string;
    const title = job.title as string;
    const company = job.company_name as string;
    try {
      const res = await resolveEmployerUrl(sUrl);
      console.log(`Job: "${title}" @ "${company}"`);
      console.log(`  Source:   ${sUrl}`);
      console.log(`  Resolved: ${res.employerUrl ? `✅ ${res.employerUrl}` : '❌ (null)'}`);
      console.log(`  IsAggregator: ${res.isAggregator}, IsATS: ${res.isAtsPlatform}, IsGov: ${res.isGovernmentPortal}\n`);
    } catch (e) {
      console.log(`Job: "${title}" -> ERROR: ${(e as Error).message}\n`);
    }
  }

  process.exit(0);
}

testResolution();
