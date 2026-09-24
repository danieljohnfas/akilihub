import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function check() {
  const active = await sql`
    SELECT pid, query, state, wait_event_type, wait_event, age(clock_timestamp(), query_start) as age 
    FROM pg_stat_activity 
    WHERE pid <> pg_backend_pid() AND state = 'active'
  `;
  console.log('Active queries on DB:');
  for (const q of active) {
    console.log(JSON.stringify(q));
  }
  await sql.end();
}
check();
