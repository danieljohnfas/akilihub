import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function testExtractor() {
  const jobs = await sql`
    SELECT id, title, company_name, description
    FROM jobs
    WHERE company_name ILIKE '%verified employer%'
       OR company_name ILIKE '%tanzanian employer%'
       OR company_name ILIKE '%anonymous%'
    LIMIT 20
  `;

  console.log(`Inspecting ${jobs.length} sample placeholder jobs:\n`);

  for (const j of jobs) {
    let extracted = null;

    // Pattern 1: Title has "... at <Company>" or "... - <Company>"
    const titleMatch = j.title.match(/(?:at|—|-)\s+([^–\-\(\[\n]+?)(?:\s+(?:jobs?|careers?|recruitment|vacancy|vacancies|ltd|limited|plc|inc|kenya|tanzania|uganda|rwanda|ghana|ethiopia|zambia|nigeria)\b|$)/i);
    if (titleMatch && titleMatch[1] && titleMatch[1].trim().length > 2) {
      extracted = titleMatch[1].trim();
    }

    // Pattern 2: Description has "Company: <Company>"
    if (!extracted && j.description) {
      const descMatch = j.description.match(/Company:\s*([^\n\r<–\(\[]+)/i);
      if (descMatch && descMatch[1] && descMatch[1].trim().length > 2) {
        extracted = descMatch[1].trim();
      }
    }

    console.log(`Title:   "${j.title}"`);
    console.log(`Current: "${j.company_name}"`);
    console.log(`Extracted: ${extracted ? `"${extracted}"` : 'NONE'}\n`);
  }

  await sql.end();
}

testExtractor().catch(console.error);
