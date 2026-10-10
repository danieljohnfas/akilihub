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

async function main() {
  console.log('Purging decommissioned businesses...');
  const res1 = await sql`DELETE FROM businesses WHERE status IN ('inactive', 'dissolved', 'suspended', 'unknown')`;
  console.log(`Deleted ${res1.count} businesses.`);

  console.log('Purging decommissioned tenders...');
  const res2 = await sql`DELETE FROM tenders WHERE status = 'closed'`;
  console.log(`Deleted ${res2.count} tenders.`);

  console.log('Purging decommissioned jobs...');
  const res3 = await sql`DELETE FROM jobs WHERE is_active = false`;
  console.log(`Deleted ${res3.count} jobs.`);

  await sql.end();
  console.log('Done purging decommissioned data.');
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
