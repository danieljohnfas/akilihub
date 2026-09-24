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

async function checkJobs() {
  console.log('=== JOBS TABLE HEALTH CHECK ===\n');

  const [total] = await sql`SELECT COUNT(*)::int as count FROM jobs`;
  const [active] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true`;
  const [expiredActive] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true AND deadline < NOW()`;
  const [nullEmp] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true AND employer_url IS NULL`;
  const [cfEmails] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true AND (description LIKE '%[email protected]%' OR requirements LIKE '%[email protected]%')`;
  const [shortReqs] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true AND (requirements IS NULL OR LENGTH(TRIM(requirements)) < 50)`;
  const [nullSector] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true AND (sector IS NULL OR TRIM(sector) = '')`;
  const [nullSkills] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true AND (skills IS NULL OR array_length(skills, 1) IS NULL)`;

  console.log(`Total jobs in database:            ${total.count}`);
  console.log(`Active jobs:                       ${active.count}`);
  console.log(`Active jobs with expired deadline: ${expiredActive.count}`);
  console.log(`Active jobs with NULL employer_url:${nullEmp.count}`);
  console.log(`Active jobs with [email protected]:${cfEmails.count}`);
  console.log(`Active jobs with short/no reqs:    ${shortReqs.count}`);
  console.log(`Active jobs with NULL sector:      ${nullSector.count}`);
  console.log(`Active jobs with NULL skills:      ${nullSkills.count}`);

  await sql.end();
}

checkJobs().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
