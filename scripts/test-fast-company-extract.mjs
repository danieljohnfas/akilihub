import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 2 });

const sampleRows = await sql`
  SELECT id, title, company_name, description, source_url
  FROM jobs
  WHERE company_name = 'TRA'
  LIMIT 20
`;

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
  const isGenericRole = /(?:officer|manager|assistant|engineer|specialist|driver|developer|accountant|director|consultant|coordinator|clerk|doctor|nurse|analyst|supervisor|intern|host|worker|technician|representative|agent|lead|admin|trainee)/i.test(cleanTitle);
  if (!isGenericRole && cleanTitle.split(/\s+/).length <= 4 && cleanTitle.length >= 3 && cleanTitle.length <= 40) {
    return cleanTitle;
  }

  return null;
}

console.log('Testing Enhanced Company Extraction:\n');
let resolvedCount = 0;
for (const row of sampleRows) {
  const comp = extractCompany(row.title, row.description);
  if (comp) resolvedCount++;
  console.log(`Title:    ${row.title}`);
  console.log(`Resolved: ${comp || '❌ (unresolved)'}`);
  console.log('---');
}

console.log(`\nResolved ${resolvedCount} of ${sampleRows.length} (${((resolvedCount / sampleRows.length) * 100).toFixed(1)}%)`);

await sql.end();
