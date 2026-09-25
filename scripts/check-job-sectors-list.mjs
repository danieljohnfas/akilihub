import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');

async function getSql() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const sql = postgres(process.env.DATABASE_URL, {
        ssl: 'require',
        max: 1,
        prepare: false,
        connect_timeout: 30,
        idle_timeout: 30,
      });
      // test query
      await sql`SELECT 1`;
      return sql;
    } catch (e) {
      console.log(`Connection attempt ${attempt} failed: ${e.message}`);
      if (attempt === 3) throw e;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function run() {
  const sql = await getSql();
  const sectors = await sql`
    SELECT sector, COUNT(*)::int as count 
    FROM jobs 
    GROUP BY sector 
    ORDER BY count DESC
  `;
  console.log('=== DISTINCT SECTORS IN JOBS ===');
  for (const s of sectors) {
    console.log(`  - "${s.sector}": ${s.count} jobs`);
  }
  await sql.end();
}

run().catch(console.error);
