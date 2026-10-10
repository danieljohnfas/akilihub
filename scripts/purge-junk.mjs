import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function nuke() {
  console.log("=== EXECUTING AGGRESSIVE PURGE ===");

  // 1. Nuke OCR failures
  const ocr = await sql`
    UPDATE jobs SET is_active = false
    WHERE is_active = true 
    AND (requirements ILIKE '%CONTENT FROM ATTACHED IMAGE FLYER%' OR description ILIKE '%CONTENT FROM ATTACHED IMAGE FLYER%')
    RETURNING id
  `;
  console.log(`Deactivated ${ocr.length} OCR flyer failures.`);

  // 2. Nuke Sidebar Junk
  const sidebar = await sql`
    UPDATE jobs SET is_active = false
    WHERE is_active = true 
    AND (description ILIKE '%All Today Yesterday This Week%' OR description ILIKE '%Sort by: Date%')
    RETURNING id
  `;
  console.log(`Deactivated ${sidebar.length} sidebar scraping junk jobs.`);

  // 3. Nuke missing/tiny requirements
  const reqs = await sql`
    UPDATE jobs SET is_active = false
    WHERE is_active = true 
    AND (requirements IS NULL OR length(trim(requirements)) < 50)
    RETURNING id
  `;
  console.log(`Deactivated ${reqs.length} jobs with missing/tiny requirements.`);

  // 4. Nuke generic/bad company names
  const companies = await sql`
    UPDATE jobs SET is_active = false
    WHERE is_active = true 
    AND (company_name IS NULL OR length(trim(company_name)) < 3 OR company_name ILIKE 'Unknown%' OR company_name ILIKE '%Confidential%')
    RETURNING id
  `;
  // 5. Nuke known spam networks
  const spamDomains = await sql`
    UPDATE jobs SET is_active = false
    WHERE is_active = true 
    AND (source_url ILIKE '%hine-crull-cared-exiler.com%' OR employer_url ILIKE '%hine-crull-cared-exiler.com%'
      OR source_url ILIKE '%jobs.tz.cari.africa%' OR employer_url ILIKE '%jobs.tz.cari.africa%')
    RETURNING id
  `;
  console.log(`Deactivated ${spamDomains.length} jobs from known spam networks.`);

  await sql.end();
}
nuke();
