import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 2, prepare: false });

async function runPass1() {
  console.log('=== PASS 1: EMPLOYERS, GUIDES, AND CORRUPTED BUSINESS DATA ===\n');

  // 1. Enrich Employers (15 rows)
  const employerSectorMap = {
    'MSD': 'Healthcare & Pharmaceuticals',
    'Uhai Water': 'Manufacturing & FMCG',
    'Market Average': 'Market Benchmark',
    'Vodacom Tanzania': 'Telecommunications & Technology',
    'NMB Bank': 'Banking & Financial Services',
    'CRDB Bank': 'Banking & Financial Services',
    'Nala': 'Fintech & Technology',
    'Selcom': 'Fintech & Payment Services',
    'Ramani': 'Supply Chain & Technology',
    'Early-stage Startup': 'Startups & Emerging Tech',
    'Public Sector': 'Public Sector & Government',
    'Private Sector': 'Private Enterprise',
    'Public Schools': 'Education',
    'Private Schools': 'Education',
    'Glassdoor': 'Recruitment & Salary Intelligence',
  };

  const employers = await sql`SELECT id, name FROM employers`;
  let empUpdated = 0;
  for (const emp of employers) {
    const sector = employerSectorMap[emp.name] || 'General';
    await sql`
      UPDATE employers
      SET sector = ${sector}, is_verified = true
      WHERE id = ${emp.id}
    `;
    empUpdated++;
    console.log(`  ✓ Updated Employer: ${emp.name.padEnd(25)} -> ${sector} (verified: true)`);
  }
  console.log(`Updated ${empUpdated} employers.\n`);

  // 2. Enrich Guides Missing Keywords (4 rows)
  const guideKeywords = {
    'write-cv-beat-ats': 'cv writing, resume optimization, ats resume, applicant tracking systems, job search tips, hiring algorithms, east africa jobs',
    'vibe-coding-sme-saas-savings': 'vibe coding, ai tools for business, african startups, sme software development, saas alternatives, internal tools, ai vibe coding',
    'land-job-tanzania-guide': 'jobs in tanzania, employment tanzania, tanzania career guide, job search dar es salaam, recruitment east africa, work in tanzania',
    'public-procurement-tenders-east-africa': 'public procurement east africa, government tenders kenya, tanzania tenders, uganda tenders, bidding guide, rfp submissions, procurement compliance'
  };

  let guidesUpdated = 0;
  for (const [slug, kws] of Object.entries(guideKeywords)) {
    const res = await sql`
      UPDATE guides
      SET keywords = ${kws}, updated_at = NOW()
      WHERE slug = ${slug} AND (keywords IS NULL OR TRIM(keywords) = '')
      RETURNING id, title
    `;
    if (res.length > 0) {
      guidesUpdated++;
      console.log(`  ✓ Added keywords to Guide: "${res[0].title}"`);
    }
  }
  console.log(`Updated ${guidesUpdated} guides.\n`);

  // 3. Clean Corrupted Businesses (6 rows with name = '48')
  const deletedBad = await sql`
    DELETE FROM businesses
    WHERE name = '48' AND registration_number ~ '^0\\.[0-9]+$'
    RETURNING id
  `;
  console.log(`  ✓ Removed ${deletedBad.length} corrupted test rows with name='48' from businesses.\n`);

  await sql.end();
  console.log('PASS 1 COMPLETE! ✅\n');
}

runPass1().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
