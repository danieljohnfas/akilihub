import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function audit() {
  console.log("=== BRUTAL SQL AUDIT ===");

  // 1. Jobs with OCR flyer failures
  const ocrFailures = await sql`
    SELECT count(*) FROM jobs 
    WHERE is_active = true 
    AND (requirements ILIKE '%CONTENT FROM ATTACHED IMAGE FLYER%' OR description ILIKE '%CONTENT FROM ATTACHED IMAGE FLYER%')
  `;
  console.log(`[Jobs] OCR Flyer failures active: ${ocrFailures[0].count}`);

  // 2. Jobs with Sidebar Scraping Junk
  const sidebarJunk = await sql`
    SELECT count(*) FROM jobs 
    WHERE is_active = true 
    AND (description ILIKE '%All Today Yesterday This Week%' OR description ILIKE '%Sort by: Date%')
  `;
  console.log(`[Jobs] Sidebar Junk active: ${sidebarJunk[0].count}`);

  // 3. Jobs with tiny or blank requirements
  const badReqs = await sql`
    SELECT count(*) FROM jobs 
    WHERE is_active = true 
    AND (requirements IS NULL OR length(trim(requirements)) < 50)
  `;
  console.log(`[Jobs] Missing/Tiny Requirements active: ${badReqs[0].count}`);

  // 4. Jobs with generic/bad company names
  const badCompanies = await sql`
    SELECT count(*) FROM jobs 
    WHERE is_active = true 
    AND (company_name IS NULL OR length(trim(company_name)) < 3 OR company_name ILIKE 'Unknown%' OR company_name ILIKE '%Confidential%')
  `;
  console.log(`[Jobs] Bad Company Names active: ${badCompanies[0].count}`);

  // 5. Businesses with bad names
  const badBusinesses = await sql`
    SELECT count(*) FROM businesses 
    WHERE name IS NULL 
    OR length(trim(name)) < 2 
    OR name ~ '^[0-9]+$' 
    OR name ILIKE 'TRA %'
  `;
  console.log(`[Businesses] Suspicious/Numeric Names: ${badBusinesses[0].count}`);

  // 6. Expired Jobs still active
  const expiredJobs = await sql`
    SELECT count(*) FROM jobs 
    WHERE is_active = true 
    AND deadline < CURRENT_DATE
  `;
  console.log(`[Jobs] Expired Deadlines still active: ${expiredJobs[0].count}`);

  await sql.end();
}
audit();
