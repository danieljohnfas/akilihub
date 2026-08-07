import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

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
  connect_timeout: 15,
});

const db = drizzle(conn);

async function runReview() {
  console.log('====================================================');
  console.log('  GLOBAL AUDIT: URL COVERAGE ACROSS ALL DATA TABLES  ');
  console.log('====================================================\n');

  // 1. JOBS
  console.log('--- 1. JOBS URL COVERAGE ---');
  const jobStats = await db.execute(sql`
    SELECT
      COUNT(*)::int as total_jobs,
      COUNT(source_url)::int as has_source_url,
      COUNT(employer_url)::int as has_employer_url,
      COUNT(CASE WHEN employer_url IS NOT NULL AND source_url IS NOT NULL THEN 1 END)::int as has_both,
      COUNT(CASE WHEN employer_url IS NOT NULL AND (source_url IS NULL OR source_url = '') THEN 1 END)::int as only_employer_url,
      COUNT(CASE WHEN source_url IS NOT NULL AND (employer_url IS NULL OR employer_url = '') THEN 1 END)::int as only_source_url,
      COUNT(CASE WHEN (source_url IS NULL OR source_url = '') AND (employer_url IS NULL OR employer_url = '') THEN 1 END)::int as has_neither,
      COUNT(CASE WHEN source_url LIKE '#%' OR employer_url LIKE '#%' THEN 1 END)::int as has_anchor_hash,
      COUNT(CASE WHEN source_url NOT LIKE 'http%' AND source_url IS NOT NULL THEN 1 END)::int as invalid_source_proto,
      COUNT(CASE WHEN employer_url NOT LIKE 'http%' AND employer_url IS NOT NULL THEN 1 END)::int as invalid_employer_proto
    FROM jobs;
  `);

  console.table(jobStats);

  // If any jobs have neither URL, let's list some samples
  const orphanJobs = await db.execute(sql`
    SELECT id, title, company_name, created_at
    FROM jobs
    WHERE (source_url IS NULL OR source_url = '') AND (employer_url IS NULL OR employer_url = '')
    LIMIT 10;
  `);
  if (orphanJobs.length > 0) {
    console.log(`⚠️ Found ${orphanJobs.length} sample jobs with NO URL:`);
    console.table(orphanJobs);
  } else {
    console.log('✅ All jobs point to at least one valid source_url or employer_url.');
  }

  // 2. TENDERS
  console.log('\n--- 2. TENDERS URL COVERAGE ---');
  const tenderStats = await db.execute(sql`
    SELECT
      COUNT(*)::int as total_tenders,
      COUNT(source_url)::int as has_source_url,
      COUNT(employer_url)::int as has_employer_url,
      COUNT(document_url)::int as has_document_url,
      COUNT(CASE WHEN (source_url IS NOT NULL AND source_url != '') OR (employer_url IS NOT NULL AND employer_url != '') OR (document_url IS NOT NULL AND document_url != '') THEN 1 END)::int as has_at_least_one_url,
      COUNT(CASE WHEN (source_url IS NULL OR source_url = '') AND (employer_url IS NULL OR employer_url = '') AND (document_url IS NULL OR document_url = '') THEN 1 END)::int as has_no_url,
      COUNT(CASE WHEN source_url LIKE '#%' THEN 1 END)::int as has_anchor_source
    FROM tenders;
  `);

  console.table(tenderStats);

  const orphanTenders = await db.execute(sql`
    SELECT id, title, contracting_authority, source_url
    FROM tenders
    WHERE (source_url IS NULL OR source_url = '' OR source_url LIKE '#%') 
      AND (employer_url IS NULL OR employer_url = '') 
      AND (document_url IS NULL OR document_url = '')
    LIMIT 10;
  `);
  if (orphanTenders.length > 0) {
    console.log(`⚠️ Found ${orphanTenders.length} tenders with no usable URL:`);
    console.table(orphanTenders);
  } else {
    console.log('✅ All tenders have at least one usable source or authority link.');
  }

  // 3. COMPLIANCE REQUIREMENTS / RESOURCES
  console.log('\n--- 3. COMPLIANCE REQUIREMENTS URL COVERAGE ---');
  const complianceStats = await db.execute(sql`
    SELECT
      COUNT(*)::int as total_requirements,
      COUNT(source_url)::int as has_source_url,
      COUNT(employer_url)::int as has_employer_url,
      COUNT(CASE WHEN (source_url IS NOT NULL AND source_url != '') OR (employer_url IS NOT NULL AND employer_url != '') THEN 1 END)::int as has_at_least_one_url,
      COUNT(CASE WHEN (source_url IS NULL OR source_url = '') AND (employer_url IS NULL OR employer_url = '') THEN 1 END)::int as has_no_url,
      COUNT(CASE WHEN source_url LIKE 'http%' THEN 1 END)::int as valid_http_source,
      COUNT(CASE WHEN employer_url LIKE 'http%' THEN 1 END)::int as valid_http_employer
    FROM compliance_requirements;
  `);
  console.table(complianceStats);

  // 4. CHECKING ANY ORPHANS IN ACTIVE DATA
  console.log('\n--- 4. ORPHAN CHECK ACROSS ACTIVE DATA ---');
  const activeJobOrphans = await db.execute(sql`
    SELECT COUNT(*)::int as active_jobs_without_url
    FROM jobs
    WHERE is_active = true 
      AND (source_url IS NULL OR source_url = '' OR source_url LIKE '#%')
      AND (employer_url IS NULL OR employer_url = '' OR employer_url LIKE '#%');
  `);

  const activeTenderOrphans = await db.execute(sql`
    SELECT COUNT(*)::int as open_tenders_without_url
    FROM tenders
    WHERE status = 'open'
      AND (source_url IS NULL OR source_url = '' OR source_url LIKE '#%')
      AND (employer_url IS NULL OR employer_url = '' OR employer_url LIKE '#%')
      AND (document_url IS NULL OR document_url = '' OR document_url LIKE '#%');
  `);

  const activeComplianceOrphans = await db.execute(sql`
    SELECT COUNT(*)::int as active_compliance_without_url
    FROM compliance_requirements
    WHERE is_active = true
      AND (source_url IS NULL OR source_url = '' OR source_url LIKE '#%')
      AND (employer_url IS NULL OR employer_url = '' OR employer_url LIKE '#%');
  `);

  console.log(`Active Jobs with NO URL: ${activeJobOrphans[0].active_jobs_without_url}`);
  console.log(`Open Tenders with NO URL: ${activeTenderOrphans[0].open_tenders_without_url}`);
  console.log(`Active Compliance with NO URL: ${activeComplianceOrphans[0].active_compliance_without_url}`);

  console.log('\n====================================================');
  console.log('  AUDIT COMPLETE');
  console.log('====================================================');
  process.exit(0);
}

runReview().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
