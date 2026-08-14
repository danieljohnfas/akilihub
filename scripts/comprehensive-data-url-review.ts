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

function isValidHttpUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 8) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function reviewAllData() {
  console.log('🔍 COMMENCING COMPREHENSIVE DATA URL AUDIT ACROSS ALL ENTITIES...\n');

  // 1. Audit JOBS
  const jobStats = await db.execute(sql`
    SELECT
      COUNT(*) AS total,
      COUNT(source_url) AS with_source_url,
      COUNT(*) FILTER (WHERE source_url IS NULL OR trim(source_url) = '') AS missing_source_url,
      COUNT(employer_url) AS with_employer_url,
      COUNT(*) FILTER (WHERE employer_url IS NULL) AS null_employer_url,
      COUNT(*) FILTER (WHERE is_aggregator_source = true) AS is_aggregator_count,
      COUNT(*) FILTER (WHERE is_aggregator_source = false) AS is_direct_count,
      COUNT(*) FILTER (WHERE (source_url IS NULL OR trim(source_url) = '') AND (employer_url IS NULL OR trim(employer_url) = '')) AS zero_url_count
    FROM jobs;
  `);

  console.log('📊 JOBS URL COVERAGE:');
  console.table(jobStats);

  // 2. Audit TENDERS
  const tenderStats = await db.execute(sql`
    SELECT
      COUNT(*) AS total,
      COUNT(source_url) AS with_source_url,
      COUNT(*) FILTER (WHERE source_url IS NULL OR trim(source_url) = '') AS missing_source_url,
      COUNT(employer_url) AS with_employer_url,
      COUNT(*) FILTER (WHERE employer_url IS NULL) AS null_employer_url,
      COUNT(*) FILTER (WHERE is_aggregator_source = true) AS is_aggregator_count,
      COUNT(*) FILTER (WHERE is_aggregator_source = false) AS is_direct_count,
      COUNT(*) FILTER (WHERE (source_url IS NULL OR trim(source_url) = '') AND (employer_url IS NULL OR trim(employer_url) = '')) AS zero_url_count
    FROM tenders;
  `);

  console.log('\n📊 TENDERS URL COVERAGE:');
  console.table(tenderStats);

  // 3. Audit COMPLIANCE REQUIREMENTS
  const complianceStats = await db.execute(sql`
    SELECT
      COUNT(*) AS total,
      COUNT(source_url) AS with_source_url,
      COUNT(*) FILTER (WHERE source_url IS NULL OR trim(source_url) = '') AS missing_source_url,
      COUNT(employer_url) AS with_employer_url,
      COUNT(*) FILTER (WHERE employer_url IS NULL) AS null_employer_url,
      COUNT(*) FILTER (WHERE is_aggregator_source = true) AS is_aggregator_count,
      COUNT(*) FILTER (WHERE is_aggregator_source = false) AS is_direct_count,
      COUNT(*) FILTER (WHERE (source_url IS NULL OR trim(source_url) = '') AND (employer_url IS NULL OR trim(employer_url) = '')) AS zero_url_count
    FROM compliance_requirements;
  `);

  console.log('\n📊 COMPLIANCE REQUIREMENTS URL COVERAGE:');
  console.table(complianceStats);

  // 4. Detailed Malformed URL Scan
  console.log('\n🔎 Scanning for any malformed / non-HTTP URLs across tables...');
  
  const allJobs = await db.execute(sql`SELECT id, source_url, employer_url FROM jobs`);
  let invalidJobUrls = 0;
  for (const j of allJobs) {
    if (j.source_url && !isValidHttpUrl(j.source_url as string)) invalidJobUrls++;
    if (j.employer_url && !isValidHttpUrl(j.employer_url as string)) invalidJobUrls++;
  }

  const allTenders = await db.execute(sql`SELECT id, source_url, employer_url FROM tenders`);
  let invalidTenderUrls = 0;
  for (const t of allTenders) {
    if (t.source_url && !isValidHttpUrl(t.source_url as string)) invalidTenderUrls++;
    if (t.employer_url && !isValidHttpUrl(t.employer_url as string)) invalidTenderUrls++;
  }

  const allCompliance = await db.execute(sql`SELECT id, source_url, employer_url FROM compliance_requirements`);
  let invalidComplianceUrls = 0;
  for (const c of allCompliance) {
    if (c.source_url && !isValidHttpUrl(c.source_url as string)) invalidComplianceUrls++;
    if (c.employer_url && !isValidHttpUrl(c.employer_url as string)) invalidComplianceUrls++;
  }

  console.log(`- Jobs with malformed URLs: ${invalidJobUrls}`);
  console.log(`- Tenders with malformed URLs: ${invalidTenderUrls}`);
  console.log(`- Compliance with malformed URLs: ${invalidComplianceUrls}`);

  process.exit(0);
}

reviewAllData().catch(e => {
  console.error(e);
  process.exit(1);
});
