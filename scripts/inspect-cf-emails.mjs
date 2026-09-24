import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function checkCF() {
  const jobs = await sql`
    SELECT id, title, company_name, source_url, 
           substring(description from '.{0,40}\\[email protected\\].{0,40}') as cf_context
    FROM jobs
    WHERE is_active = true AND (description LIKE '%[email protected]%' OR requirements LIKE '%[email protected]%')
    LIMIT 10
  `;
  console.log('Sample CF email jobs:');
  for (const j of jobs) {
    console.log(`[${j.company_name}] ${j.title}`);
    console.log(`  Source: ${j.source_url}`);
    console.log(`  Context: ${j.cf_context}\n`);
  }
  await sql.end();
}
checkCF();
