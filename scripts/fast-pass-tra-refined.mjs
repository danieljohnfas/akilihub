import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 2, prepare: false });

function extractRefinedCompany(title, desc) {
  if (!title) return null;
  // Normalize whitespace, non-breaking spaces, and quotes
  let clean = title.replace(/\u00a0/g, ' ').replace(/[’‘`]/g, "'").trim();
  // Strip trailing dates like "– August 2026", "- 2026", etc.
  clean = clean.replace(/\s+[—–-]\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)?\s*\d{4}\s*$/i, '').trim();

  // Pattern: "... at Company Name"
  const atMatch = clean.match(/(?:at|for|in|kwenye|katika)\s+([\p{L}0-9&.,'()/\s-]{3,70})$/u);
  if (atMatch && atMatch[1].trim()) {
    let candidate = atMatch[1].trim();
    if (!/^(internship|vacancy|job|urgent|hiring|remote|fresh|tenders?|recruitment)/i.test(candidate)) {
      return candidate;
    }
  }

  // Pattern: "Company — Role"
  const dashMatch = clean.match(/^([\p{L}0-9&.,'()/\s-]{2,50}?)\s+[—–\-|]\s+/u);
  if (dashMatch && dashMatch[1].trim()) {
    const candidate = dashMatch[1].trim();
    if (!/^(internship|vacancy|job|urgent|hiring|remote|fresh|tenders?|recruitment|nafasi|\d+\s+job)/i.test(candidate)) {
      return candidate;
    }
  }

  // Pattern: "X (Company) is Urgently Needed"
  const urgentMatch = clean.match(/\(([\p{L}0-9&.,'/\s-]+)\)\s+is\s+urgently\s+needed/i);
  if (urgentMatch && urgentMatch[1].trim()) {
    return urgentMatch[1].trim();
  }

  return null;
}

const rows = await sql`
  SELECT id, title, description
  FROM jobs
  WHERE company_name = 'TRA'
`;

let fixed = 0;
for (const r of rows) {
  const comp = extractRefinedCompany(r.title, r.description);
  if (comp && comp !== 'TRA') {
    await sql`
      UPDATE jobs
      SET company_name = ${comp}, updated_at = NOW()
      WHERE id = ${r.id}
    `;
    fixed++;
  }
}

console.log(`Refined pass fixed an additional ${fixed} records.`);
const [rem] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE company_name = 'TRA'`;
console.log(`Remaining TRA in DB: ${rem.count}`);

await sql.end();
