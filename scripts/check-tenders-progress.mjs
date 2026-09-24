import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, prepare: false });

async function check() {
  const [sectorCount] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE sector_id IS NOT NULL`;
  const [empCount] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE employer_url IS NOT NULL`;
  const [closedCount] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE status = 'closed'`;
  const [summaryCount] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE ai_summary IS NOT NULL`;
  console.log('Tenders with sector_id:   ', sectorCount.count);
  console.log('Tenders with employer_url: ', empCount.count);
  console.log('Tenders marked closed:    ', closedCount.count);
  console.log('Tenders with ai_summary:  ', summaryCount.count);
  await sql.end();
}

check();
