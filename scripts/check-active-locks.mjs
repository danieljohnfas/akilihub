import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function checkLocks() {
  const active = await sql`
    SELECT pid, query, state, wait_event_type, wait_event, age(clock_timestamp(), query_start) as age 
    FROM pg_stat_activity 
    WHERE pid <> pg_backend_pid() AND state != 'idle'
  `;
  console.log('Active queries on DB:');
  for (const q of active) {
    console.log(JSON.stringify(q));
  }

  const [count] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements`;
  console.log('Compliance count test:', count.count);

  await sql.end();
}

checkLocks().catch(e => { console.error('Error:', e); process.exit(1); });
