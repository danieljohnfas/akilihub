import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { resolveEmployerUrl, classifySourceUrl } from '../src/lib/sources/employer-resolver';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const conn = postgres(dbUrl, {
  ssl: dbUrl.includes('supabase.com') || dbUrl.includes('neon.tech') || dbUrl.includes('pooler.supabase.com') ? 'require' : false,
  max: 10,
});
const db = drizzle(conn);

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBackfill() {
  console.log('🚀 STARTING COMPREHENSIVE EMPLOYER URL RESOLUTION BACKFILL...\n');

  // 1. Check user-specific job first
  const specificJobId = 'cdd94c9d-8a66-4662-9cdf-64afca5fe667';
  const specific = await db.execute(sql`
    SELECT id, title, company_name, source_url, employer_url
    FROM jobs
    WHERE id = ${specificJobId};
  `);

  if (specific.length > 0) {
    const sj = specific[0];
    console.log(`📌 Checking user-reported job: "${sj.title}" @ "${sj.company_name}"`);
    console.log(`   Source: ${sj.source_url}`);
    const resolved = await resolveEmployerUrl(sj.source_url as string, {
      title: sj.title as string,
      company: sj.company_name as string,
    });
    console.log(`   Resolved: ${resolved.employerUrl} [${resolved.method}]\n`);
    
    await db.execute(sql`
      UPDATE jobs
      SET employer_url = ${resolved.employerUrl},
          is_aggregator_source = ${resolved.isAggregator},
          updated_at = NOW()
      WHERE id = ${specificJobId};
    `);
  }

  // 2. Resolve remaining unjobs & aggregator records in jobs
  console.log('--- Processing Jobs with Aggregator Sources ---');
  const pendingJobs = await db.execute(sql`
    SELECT id, title, company_name, source_url
    FROM jobs
    WHERE is_active = true
      AND (
        employer_url IS NULL
        OR employer_url ILIKE '%unjobs%'
        OR employer_url ILIKE '%africareers%'
        OR employer_url ILIKE '%myjobmag%'
        OR employer_url ILIKE '%ngojobsinafrica%'
        OR employer_url ILIKE '%brightermonday%'
        OR employer_url ILIKE '%alljobspo%'
        OR employer_url ILIKE '%jobwebrwanda%'
        OR employer_url ILIKE '%ethiopianreporter%'
        OR employer_url ILIKE '%ajiriwa%'
        OR employer_url ILIKE '%zoomtanzania%'
      )
    ORDER BY created_at DESC
    LIMIT 100;
  `);

  console.log(`Found ${pendingJobs.length} priority aggregator jobs to resolve.`);
  let resolvedCount = 0;

  for (let i = 0; i < pendingJobs.length; i++) {
    const job = pendingJobs[i];
    const sourceUrl = job.source_url as string;
    const title = (job.title as string) || '';
    const company = (job.company_name as string) || '';

    try {
      const res = await resolveEmployerUrl(sourceUrl, { title, company });
      
      await db.execute(sql`
        UPDATE jobs
        SET employer_url = ${res.employerUrl},
            is_aggregator_source = ${res.isAggregator},
            updated_at = NOW()
        WHERE id = ${job.id as string};
      `);

      if (res.employerUrl) {
        resolvedCount++;
        console.log(`[${i + 1}/${pendingJobs.length}] ✅ Resolved: [${company.slice(0, 25)}] -> ${res.employerUrl} (${res.method})`);
      } else {
        console.log(`[${i + 1}/${pendingJobs.length}] ⚪ Flagged aggregator (no external link): [${company.slice(0, 25)}]`);
      }

      await sleep(300);
    } catch (err: any) {
      console.error(`[${i + 1}/${pendingJobs.length}] ❌ Error for ${job.id}:`, err.message);
    }
  }

  console.log(`\n🎉 Backfill chunk complete! Resolved: ${resolvedCount}/${pendingJobs.length}`);

  // 3. Check final statistics
  const stats = await db.execute(sql`
    SELECT
      COUNT(*) AS total_jobs,
      COUNT(employer_url) AS with_employer_url,
      COUNT(*) FILTER (WHERE employer_url IS NULL) AS null_employer_url,
      COUNT(*) FILTER (WHERE is_aggregator_source = true) AS aggregator_sources,
      COUNT(*) FILTER (WHERE is_aggregator_source = false) AS direct_sources
    FROM jobs
    WHERE is_active = true;
  `);

  console.log('\n📊 Jobs Status Summary:');
  console.table(stats);

  process.exit(0);
}

runBackfill().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
