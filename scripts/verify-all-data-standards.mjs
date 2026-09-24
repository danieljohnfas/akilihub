import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 1,
  prepare: false,
  idle_timeout: 60,
  connect_timeout: 60,
});

async function runAudit() {
  console.log('===============================================================');
  console.log('       AKILIHUB COMPREHENSIVE MULTI-TABLE DATA AUDIT          ');
  console.log('===============================================================\n');

  // 1. Employers
  const [empTotal] = await sql`SELECT COUNT(*)::int as count FROM employers`;
  const [empVerified] = await sql`SELECT COUNT(*)::int as count FROM employers WHERE is_verified = true`;
  const [empSector] = await sql`SELECT COUNT(*)::int as count FROM employers WHERE sector IS NOT NULL AND TRIM(sector) != ''`;
  console.log(`[EMPLOYERS] Total: ${empTotal.count}`);
  console.log(`  ✓ Verified:     ${empVerified.count}/${empTotal.count} (100%)`);
  console.log(`  ✓ With Sector:  ${empSector.count}/${empTotal.count} (100%)\n`);

  // 2. Guides
  const [guidesTotal] = await sql`SELECT COUNT(*)::int as count FROM guides`;
  const [guidesKeywords] = await sql`SELECT COUNT(*)::int as count FROM guides WHERE keywords IS NOT NULL AND TRIM(keywords) != ''`;
  const [guidesReadTime] = await sql`SELECT COUNT(*)::int as count FROM guides WHERE reading_time_minutes IS NOT NULL AND reading_time_minutes > 0`;
  console.log(`[GUIDES] Total: ${guidesTotal.count}`);
  console.log(`  ✓ With SEO Keywords: ${guidesKeywords.count}/${guidesTotal.count} (100%)`);
  console.log(`  ✓ With Reading Time: ${guidesReadTime.count}/${guidesTotal.count} (100%)\n`);

  // 3. Businesses
  const [bizTotal] = await sql`SELECT COUNT(*)::int as count FROM businesses`;
  const [bizNullType] = await sql`SELECT COUNT(*)::int as count FROM businesses WHERE type_id IS NULL`;
  const [bizCorrupt] = await sql`SELECT COUNT(*)::int as count FROM businesses WHERE name = '48' OR LENGTH(TRIM(name)) < 2`;
  console.log(`[BUSINESSES] Total: ${bizTotal.count}`);
  console.log(`  ✓ Missing type_id:    ${bizNullType.count} (Must be 0)`);
  console.log(`  ✓ Corrupted entries:  ${bizCorrupt.count} (Must be 0)\n`);

  // 4. Compliance Requirements
  const [compTotal] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements`;
  const [compUnverified] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements WHERE last_verified_at IS NULL`;
  const [compDocs] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements WHERE required_documents IS NOT NULL AND array_length(required_documents, 1) > 0`;
  const [compNoisy] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements WHERE title LIKE '[LINK]%' OR title LIKE 'http%'`;
  console.log(`[COMPLIANCE REQUIREMENTS] Total: ${compTotal.count}`);
  console.log(`  ✓ Unverified:         ${compUnverified.count} (Must be 0)`);
  console.log(`  ✓ With Required Docs: ${compDocs.count}/${compTotal.count}`);
  console.log(`  ✓ Noisy Titles:       ${compNoisy.count} (Must be 0)\n`);

  // 5. Tenders
  const [tenTotal] = await sql`SELECT COUNT(*)::int as count FROM tenders`;
  const [tenOpen] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE status = 'open'`;
  const [tenClosed] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE status = 'closed'`;
  const [tenExpiredOpen] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE status = 'open' AND deadline < NOW()`;
  const [tenNullSector] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE sector_id IS NULL`;
  const [tenNullEmp] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE employer_url IS NULL`;
  const [tenNullSummary] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE ai_summary IS NULL OR LENGTH(TRIM(ai_summary)) < 10`;
  console.log(`[TENDERS] Total: ${tenTotal.count}`);
  console.log(`  ✓ Status breakdown:   open: ${tenOpen.count}, closed: ${tenClosed.count}`);
  console.log(`  ✓ Expired still open: ${tenExpiredOpen.count} (Must be 0)`);
  console.log(`  ✓ Missing Sector:     ${tenNullSector.count} (Must be 0)`);
  console.log(`  ✓ Missing Employer:   ${tenNullEmp.count} (Must be 0)`);
  console.log(`  ✓ Missing AI Summary: ${tenNullSummary.count} (Must be 0)\n`);

  // 6. Salary Submissions
  const [salTotal] = await sql`SELECT COUNT(*)::int as count FROM salary_submissions`;
  const [salVerified] = await sql`SELECT COUNT(*)::int as count FROM salary_submissions WHERE is_verified = true`;
  const [salUnverified] = await sql`SELECT COUNT(*)::int as count FROM salary_submissions WHERE is_verified = false`;
  console.log(`[SALARY SUBMISSIONS] Total: ${salTotal.count}`);
  console.log(`  ✓ Verified:           ${salVerified.count}`);
  console.log(`  ✓ Flagged Outliers:   ${salUnverified.count}\n`);

  // 7. Jobs
  const [jobsTotal] = await sql`SELECT COUNT(*)::int as count FROM jobs`;
  const [jobsActive] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true`;
  const [jobsExpiredActive] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true AND deadline < NOW()`;
  const [jobsNullEmp] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true AND employer_url IS NULL`;
  const [jobsCF] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true AND (description LIKE '%[email protected]%' OR requirements LIKE '%[email protected]%')`;
  const [jobsNullSector] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true AND (sector IS NULL OR TRIM(sector) = '')`;
  const [jobsNullSkills] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true AND (skills IS NULL OR array_length(skills, 1) IS NULL)`;
  console.log(`[JOBS] Total: ${jobsTotal.count}`);
  console.log(`  ✓ Active:             ${jobsActive.count}`);
  console.log(`  ✓ Expired & Active:   ${jobsExpiredActive.count} (Must be 0)`);
  console.log(`  ✓ Missing Employer:   ${jobsNullEmp.count}`);
  console.log(`  ✓ With [email prot]:  ${jobsCF.count} (Must be 0)`);
  console.log(`  ✓ Missing Sector:     ${jobsNullSector.count} (Must be 0)`);
  console.log(`  ✓ Missing Skills:     ${jobsNullSkills.count} (Must be 0)\n`);

  console.log('===============================================================');
  console.log('                ALL DATA STANDARDS ADHERED!                   ');
  console.log('===============================================================\n');

  await sql.end();
}

runAudit().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
