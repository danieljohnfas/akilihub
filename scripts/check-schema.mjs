import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function checkSchema() {
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log("TABLES:", tables.map(r => r.table_name).join(', '));
  
  // also check row counts
  for (const t of tables) {
    const res = await sql.unsafe(`SELECT COUNT(*) FROM ${t.table_name}`);
    console.log(`${t.table_name.padEnd(30)} : ${res[0].count} rows`);
  }
  
  await sql.end();
}
checkSchema();
