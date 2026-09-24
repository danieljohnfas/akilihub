import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function run() {
  const sample = await sql`
    SELECT id, title, description, category, issuing_authority, renewal_period_days, estimated_cost, required_documents, source_url
    FROM compliance_requirements
    LIMIT 5
  `;
  console.log('COMPLIANCE SAMPLE:');
  for (const c of sample) {
    console.log(JSON.stringify(c, null, 2));
  }
  await sql.end();
}

run();
