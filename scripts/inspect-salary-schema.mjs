import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false, idle_timeout: 60, connect_timeout: 60 });

async function check() {
  const cols = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'salary_submissions'
    ORDER BY ordinal_position
  `;
  console.log('salary_submissions columns:');
  for (const c of cols) console.log(' ', c.column_name, c.data_type);
  await sql.end();
}
check();
