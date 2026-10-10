import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function searchTemplates() {
  const spamJobs = await sql`
    SELECT id, title, company_name, source_url 
    FROM jobs 
    WHERE is_active = true 
    AND (
      description ILIKE '%uchukue udhibiti wa mustakabali wako%'
      OR description ILIKE '%Pakiti yetu ya $%'
      OR description ILIKE '%Tangazo jipya la kazi limetolewa leo%'
      OR description ILIKE '%udhibiti wa mustakabali%'
    )
  `;
  console.log(`Found ${spamJobs.length} active jobs matching the procedural Swahili template.`);

  if (spamJobs.length > 0) {
    const urls = new Set(spamJobs.map(j => j.source_url.split('/')[2]));
    console.log("Associated domains:", Array.from(urls));
  }
  
  await sql.end();
}
searchTemplates();
