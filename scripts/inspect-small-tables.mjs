import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 2, prepare: false });

async function checkSmallTables() {
  console.log('=== EMPLOYERS (all 15) ===');
  const employers = await sql`SELECT * FROM employers`;
  console.log(employers);

  console.log('\n=== GUIDES MISSING KEYWORDS ===');
  const guides = await sql`SELECT id, slug, title, summary, keywords, reading_time_minutes FROM guides WHERE keywords IS NULL OR TRIM(keywords) = ''`;
  console.log(guides);

  console.log('\n=== UNVERIFIED SALARY SUBMISSIONS ===');
  const salaries = await sql`SELECT id, job_title, gross_monthly_salary, currency, experience_level, is_verified, submitted_at FROM salary_submissions WHERE is_verified = false`;
  console.log(salaries);

  console.log('\n=== TENDER SECTORS ===');
  const tSectors = await sql`SELECT * FROM tender_sectors`;
  console.log(tSectors);

  console.log('\n=== BUSINESS TYPES ===');
  const bTypes = await sql`SELECT * FROM business_types`;
  console.log(bTypes);

  await sql.end();
}

checkSmallTables().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
