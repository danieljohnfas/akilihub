import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function run() {
  const res = await sql`UPDATE jobs SET employer_url = NULL, is_aggregator_source = true WHERE employer_url ILIKE '%ajiranew.com%'`;
  console.log(res);
  await sql.end();
}
run();
