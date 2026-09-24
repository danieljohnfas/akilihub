import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function check() {
  const [dummy] = await sql`SELECT COUNT(*)::int as count FROM businesses WHERE registration_number ~ '^0\\.[0-9]+$'`;
  const [real] = await sql`SELECT COUNT(*)::int as count FROM businesses WHERE NOT (registration_number ~ '^0\\.[0-9]+$')`;
  console.log('Dummy Math.random() businesses:', dummy.count);
  console.log('Real businesses:', real.count);
  const realRows = await sql`SELECT * FROM businesses WHERE NOT (registration_number ~ '^0\\.[0-9]+$') LIMIT 30`;
  console.log('Real rows count sample:', realRows.length);
  for (const r of realRows) {
    console.log(JSON.stringify(r));
  }
  await sql.end();
}

check();
