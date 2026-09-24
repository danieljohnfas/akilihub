import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

// All tables
const tables = await sql`
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name
`;

console.log('=== ALL TABLES ===');
for (const { table_name } of tables) {
  const [cnt] = await sql`SELECT COUNT(*)::int as count FROM ${sql(table_name)}`;
  console.log(`  ${table_name.padEnd(35)} ${cnt.count} rows`);
}

// Full schema for each table
console.log('\n=== COLUMNS PER TABLE ===');
for (const { table_name } of tables) {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table_name}
    ORDER BY ordinal_position
  `;
  console.log(`\n[${table_name}]`);
  for (const c of cols) {
    const nullable = c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
    console.log(`  ${c.column_name.padEnd(30)} ${c.data_type.padEnd(25)} ${nullable}`);
  }
}

await sql.end();
