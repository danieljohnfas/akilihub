import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 2, prepare: false });

function extractCompany(title, desc) {
  if (!title) return null;
  const cleanTitle = title.trim();

  // 1. "Role at Company" / "Role for Company" / "Role in Company" (Unicode-safe)
  const atMatch = cleanTitle.match(/(?:at|for|in|kwenye|katika)\s+([\p{L}0-9&.,'\s-]{3,60})$/u);
  if (atMatch && atMatch[1].trim()) {
    let candidate = atMatch[1].trim().replace(/\s+(?:Tanzania|Kenya|Uganda|Rwanda|Ethiopia)$/i, '');
    if (!/^(internship|vacancy|job|urgent|hiring|remote|fresh|tenders?|recruitment)/i.test(candidate)) {
      return candidate;
    }
  }

  // 2. "Company — Role" / "Company - Role" / "Company | Role"
  const dashMatch = cleanTitle.match(/^([\p{L}0-9&.,'\s]{2,45}?)\s+[—–\-|]\s+/u);
  if (dashMatch && dashMatch[1].trim()) {
    const candidate = dashMatch[1].trim();
    if (!/^(internship|vacancy|job|urgent|hiring|remote|fresh|tenders?|recruitment|nafasi)/i.test(candidate)) {
      return candidate;
    }
  }

  // 3. Look in description for "Organization: X" or "Company: X" or "Employer: X"
  if (desc) {
    const orgMatch = desc.match(/(?:Organization|Company|Employer|Shirika|Mwajiri)[:\s]+([\p{L}0-9&.,'\s]{3,50})(?:\n|\r|$)/u);
    if (orgMatch && orgMatch[1].trim()) {
      return orgMatch[1].trim();
    }
  }

  // 4. If title is just a company name (1-3 words, no common role words)
  const isGenericRole = /(?:officer|manager|assistant|engineer|specialist|driver|developer|accountant|director|consultant|coordinator|clerk|doctor|nurse|analyst|supervisor|intern|host|worker|technician|representative|agent|lead|admin|trainee|clerk)/i.test(cleanTitle);
  if (!isGenericRole && cleanTitle.split(/\s+/).length <= 4 && cleanTitle.length >= 3 && cleanTitle.length <= 40) {
    return cleanTitle;
  }

  return null;
}

async function run() {
  console.log('Fetching all jobs with company_name = "TRA"...\n');

  const rows = await sql`
    SELECT id, title, description, company_name
    FROM jobs
    WHERE company_name = 'TRA'
  `;

  console.log(`Found ${rows.length} jobs with corrupted 'TRA' company name.`);

  let updated = 0;
  let unresolved = 0;
  const batchSize = 100;

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);

    for (const row of chunk) {
      const trueCompany = extractCompany(row.title, row.description);
      if (trueCompany && trueCompany !== 'TRA') {
        await sql`
          UPDATE jobs
          SET company_name = ${trueCompany}, updated_at = NOW()
          WHERE id = ${row.id}
        `;
        updated++;
      } else {
        unresolved++;
      }
    }

    process.stdout.write(`\rProcessed ${Math.min(i + batchSize, rows.length)} / ${rows.length} (Updated: ${updated}, Unresolved: ${unresolved})`);
  }

  console.log(`\n\n✅ Company name fix complete!`);
  console.log(`   Successfully fixed: ${updated} records`);
  console.log(`   Unresolved:         ${unresolved} records`);

  const [remaining] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE company_name = 'TRA'`;
  console.log(`   Remaining TRA in DB: ${remaining.count}`);

  await sql.end();
}

run().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
