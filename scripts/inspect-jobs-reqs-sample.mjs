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

async function run() {
  console.log('=== SAMPLE JOBS WITH SHORT/MISSING REQUIREMENTS ===\n');

  const sample = await sql`
    SELECT id, title, company_name, requirements, description, source_url
    FROM jobs
    WHERE is_active = true AND (requirements IS NULL OR LENGTH(TRIM(requirements)) < 50)
    LIMIT 10
  `;

  for (const s of sample) {
    console.log(`--- [${s.company_name}] ${s.title} ---`);
    console.log(`Current reqs length: ${s.requirements ? s.requirements.length : 0}`);
    console.log(`Desc length: ${s.description ? s.description.length : 0}`);
    console.log(`Desc preview: ${(s.description || '').substring(0, 300)}...`);
    console.log();
  }

  await sql.end();
}

run().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
