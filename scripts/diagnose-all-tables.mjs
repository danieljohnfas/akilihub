import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 2, prepare: false });

async function diagnose() {
  console.log('=== MULTI-TABLE DATABASE HEALTH DIAGNOSTIC ===\n');

  // 1. TENDERS
  const [tTotal] = await sql`SELECT COUNT(*)::int as count FROM tenders`;
  const [tExpiredOpen] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE deadline < NOW() AND status != 'closed'`;
  const [tNoSummary] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE ai_summary IS NULL OR LENGTH(TRIM(ai_summary)) < 10`;
  const [tNoSector] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE sector_id IS NULL`;
  const [tNoEmployer] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE employer_url IS NULL`;
  const [tAggregators] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE is_aggregator_source = true`;
  const tStatuses = await sql`SELECT status, COUNT(*)::int as count FROM tenders GROUP BY status`;
  
  console.log(`[TENDERS] Total: ${tTotal.count}`);
  console.log(`  - Expired but still open: ${tExpiredOpen.count}`);
  console.log(`  - Missing AI summary:     ${tNoSummary.count}`);
  console.log(`  - Missing sector_id:      ${tNoSector.count}`);
  console.log(`  - Missing employer_url:   ${tNoEmployer.count}`);
  console.log(`  - Flagged as aggregator:  ${tAggregators.count}`);
  console.log(`  - Status breakdown:`, tStatuses.map(s => `${s.status}:${s.count}`).join(', '));

  // 2. BUSINESSES
  const [bTotal] = await sql`SELECT COUNT(*)::int as count FROM businesses`;
  const bStatuses = await sql`SELECT status, COUNT(*)::int as count FROM businesses GROUP BY status ORDER BY count DESC LIMIT 10`;
  const [bNoType] = await sql`SELECT COUNT(*)::int as count FROM businesses WHERE type_id IS NULL`;
  const [bBadName] = await sql`SELECT COUNT(*)::int as count FROM businesses WHERE name IS NULL OR TRIM(name) = '' OR LENGTH(TRIM(name)) < 3`;
  const [bNoAddress] = await sql`SELECT COUNT(*)::int as count FROM businesses WHERE address IS NULL OR TRIM(address) = ''`;
  const [bNoDirectors] = await sql`SELECT COUNT(*)::int as count FROM businesses WHERE directors IS NULL OR array_length(directors, 1) IS NULL`;
  
  console.log(`\n[BUSINESSES] Total: ${bTotal.count}`);
  console.log(`  - Statuses (top 10):`, bStatuses.map(s => `${s.status}:${s.count}`).join(', '));
  console.log(`  - Missing type_id:    ${bNoType.count}`);
  console.log(`  - Blank/short names:  ${bBadName.count}`);
  console.log(`  - Missing address:    ${bNoAddress.count}`);
  console.log(`  - Missing directors:  ${bNoDirectors.count}`);

  // 3. COMPLIANCE REQUIREMENTS
  const [cTotal] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements`;
  const [cUnverified] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements WHERE last_verified_at IS NULL`;
  const [cNoDocs] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements WHERE required_documents IS NULL OR array_length(required_documents, 1) IS NULL`;
  const [cNoRenewal] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements WHERE renewal_period_days IS NULL`;
  const [cNoCost] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements WHERE estimated_cost IS NULL`;
  const [cNoSource] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements WHERE source_url IS NULL`;
  
  console.log(`\n[COMPLIANCE REQUIREMENTS] Total: ${cTotal.count}`);
  console.log(`  - Never verified:          ${cUnverified.count}`);
  console.log(`  - Missing required_docs:   ${cNoDocs.count}`);
  console.log(`  - Missing renewal_period:  ${cNoRenewal.count}`);
  console.log(`  - Missing estimated_cost:  ${cNoCost.count}`);
  console.log(`  - Missing source_url:      ${cNoSource.count}`);

  // 4. GUIDES
  const [gTotal] = await sql`SELECT COUNT(*)::int as count FROM guides`;
  const [gNoKeywords] = await sql`SELECT COUNT(*)::int as count FROM guides WHERE keywords IS NULL OR TRIM(keywords) = ''`;
  const [gNoReadingTime] = await sql`SELECT COUNT(*)::int as count FROM guides WHERE reading_time_minutes IS NULL OR reading_time_minutes <= 0`;
  const [gUnpublished] = await sql`SELECT COUNT(*)::int as count FROM guides WHERE is_published = false`;
  
  console.log(`\n[GUIDES] Total: ${gTotal.count}`);
  console.log(`  - Missing keywords:     ${gNoKeywords.count}`);
  console.log(`  - Missing reading time: ${gNoReadingTime.count}`);
  console.log(`  - Unpublished:          ${gUnpublished.count}`);

  // 5. PROFESSIONS
  const [pTotal] = await sql`SELECT COUNT(*)::int as count FROM professions`;
  const [pIncomplete] = await sql`
    SELECT COUNT(*)::int as count FROM professions 
    WHERE automation_risk_score IS NULL 
       OR resilience_rationale IS NULL 
       OR upskilling_advice IS NULL 
       OR founder_opportunity IS NULL
  `;
  const pRows = await sql`SELECT name, automation_risk_score, LENGTH(COALESCE(resilience_rationale,'')) as r_len FROM professions`;
  console.log(`\n[PROFESSIONS] Total: ${pTotal.count}`);
  console.log(`  - Incomplete professions: ${pIncomplete.count}`);
  console.log(`  - Details:`, pRows.map(p => `${p.name} (score:${p.automation_risk_score}, r_len:${p.r_len})`).join('; '));

  // 6. EMPLOYERS
  const [eTotal] = await sql`SELECT COUNT(*)::int as count FROM employers`;
  const [eNoSector] = await sql`SELECT COUNT(*)::int as count FROM employers WHERE sector IS NULL OR TRIM(sector) = ''`;
  const [eUnverified] = await sql`SELECT COUNT(*)::int as count FROM employers WHERE is_verified = false`;
  console.log(`\n[EMPLOYERS] Total: ${eTotal.count}`);
  console.log(`  - Missing sector: ${eNoSector.count}`);
  console.log(`  - Unverified:     ${eUnverified.count}`);

  // 7. SALARY SUBMISSIONS
  const [sTotal] = await sql`SELECT COUNT(*)::int as count FROM salary_submissions`;
  const [sUnverified] = await sql`SELECT COUNT(*)::int as count FROM salary_submissions WHERE is_verified = false`;
  console.log(`\n[SALARY SUBMISSIONS] Total: ${sTotal.count}`);
  console.log(`  - Unverified submissions: ${sUnverified.count}`);

  // 8. JOBS
  const [jTotal] = await sql`SELECT COUNT(*)::int as count FROM jobs`;
  const [jActive] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true`;
  const [jMissingReqActive] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true AND (requirements IS NULL OR LENGTH(TRIM(requirements)) < 20)`;
  const [jMissingEmployerActive] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true AND employer_url IS NULL`;
  const [jCfEmailActive] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true AND (description LIKE '%[email protected]%' OR requirements LIKE '%[email protected]%')`;
  console.log(`\n[JOBS] Total: ${jTotal.count} (Active: ${jActive.count})`);
  console.log(`  - Active missing requirements: ${jMissingReqActive.count}`);
  console.log(`  - Active missing employer_url: ${jMissingEmployerActive.count}`);
  console.log(`  - Active with [email protected]: ${jCfEmailActive.count}`);

  await sql.end();
}

diagnose().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
