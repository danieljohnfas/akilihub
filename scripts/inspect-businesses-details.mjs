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
  console.log('=== BUSINESSES DEEP DIVE ===\n');

  // Total
  const [total] = await sql`SELECT COUNT(*)::int as count FROM businesses`;
  console.log('Total businesses:', total.count);

  // Real vs Dummy
  const [dummy] = await sql`
    SELECT COUNT(*)::int as count 
    FROM businesses 
    WHERE registration_number ~ '^0\\.[0-9]+$'
  `;
  console.log('Dummy businesses (registration_number ~ 0.xxx):', dummy.count);

  const real = await sql`
    SELECT b.id, b.name, b.registration_number, b.type_id, bt.name as type_name, c.name as country_name
    FROM businesses b
    LEFT JOIN business_types bt ON b.type_id = bt.id
    LEFT JOIN countries c ON b.country_id = c.id
    WHERE NOT (b.registration_number ~ '^0\\.[0-9]+$')
    LIMIT 50
  `;
  console.log(`\nReal businesses found (${real.length}):`);
  for (const r of real) {
    console.log(`  - [${r.country_name || 'N/A'}] ${r.name.padEnd(35)} (Reg: ${r.registration_number}) | Type: ${r.type_name || 'NULL'}`);
  }

  // Business Types
  const bTypes = await sql`SELECT id, name, slug FROM business_types`;
  console.log('\nAvailable Business Types:');
  for (const bt of bTypes) {
    console.log(`  - ${bt.slug.padEnd(25)} (ID: ${bt.id}) -> ${bt.name}`);
  }

  await sql.end();
}

run().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
