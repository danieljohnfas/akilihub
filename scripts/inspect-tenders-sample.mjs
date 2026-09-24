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
    SELECT id, reference_no, title, contracting_authority, status, deadline, source_url, employer_url, is_aggregator_source, LEFT(COALESCE(description, ''), 150) as desc_sample
    FROM tenders
    ORDER BY created_at DESC
    LIMIT 6
  `;
  console.log('TENDERS RECENT SAMPLE:');
  for (const t of sample) {
    console.log(JSON.stringify(t, null, 2));
  }

  const [openUpcoming] = await sql`SELECT COUNT(*)::int as count FROM tenders WHERE deadline >= NOW()`;
  console.log(`\nTenders with future deadline: ${openUpcoming.count}`);

  const upcomingSample = await sql`
    SELECT id, title, contracting_authority, deadline, status, source_url
    FROM tenders
    WHERE deadline >= NOW()
    LIMIT 5
  `;
  console.log('\nUPCOMING TENDERS:');
  for (const t of upcomingSample) {
    console.log(JSON.stringify(t, null, 2));
  }

  await sql.end();
}

run();
