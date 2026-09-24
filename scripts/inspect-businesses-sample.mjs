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
    SELECT id, registration_number, name, country_id, status, type_id, address
    FROM businesses
    LIMIT 15
  `;
  console.log('BUSINESSES SAMPLE:');
  for (const b of sample) {
    console.log(JSON.stringify(b));
  }

  const badNames = await sql`
    SELECT id, registration_number, name, status
    FROM businesses
    WHERE name IS NULL OR TRIM(name) = '' OR LENGTH(TRIM(name)) < 3
  `;
  console.log('\nBAD NAMES:');
  for (const b of badNames) {
    console.log(JSON.stringify(b));
  }

  await sql.end();
}

run();
