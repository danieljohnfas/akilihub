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

async function cleanAllJobs() {
  console.log('=== CLEANING ALL JOBS (ACTIVE + ARCHIVED) ===\n');

  // 1. employer_url on all rows
  const emp = await sql`
    UPDATE jobs
    SET employer_url = source_url, updated_at = NOW()
    WHERE employer_url IS NULL AND source_url IS NOT NULL AND TRIM(source_url) != ''
    RETURNING id
  `;
  console.log(`  ✓ Updated employer_url on ${emp.length} jobs.`);

  // 2. [email protected] on all rows
  const cf = await sql`
    UPDATE jobs
    SET 
      description = REPLACE(description, '[email protected]', 'the official hiring team'),
      requirements = REPLACE(requirements, '[email protected]', 'the official hiring team'),
      updated_at = NOW()
    WHERE (description LIKE '%[email protected]%' OR requirements LIKE '%[email protected]%')
    RETURNING id
  `;
  console.log(`  ✓ Cleaned [email protected] on ${cf.length} jobs.`);

  // 3. requirements on all rows
  const reqs = await sql`
    UPDATE jobs
    SET requirements = CONCAT(
      'Role qualifications and core competencies for ', title, ' at ', company_name, '. Relevant professional background, industry experience, and proven track record required.'
    ),
    updated_at = NOW()
    WHERE (requirements IS NULL OR LENGTH(TRIM(requirements)) < 30)
    RETURNING id
  `;
  console.log(`  ✓ Enriched requirements on ${reqs.length} jobs.`);

  const [nullEmp] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE employer_url IS NULL`;
  const [nullReq] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE requirements IS NULL OR LENGTH(TRIM(requirements)) < 30`;
  const [hasCf]   = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE description LIKE '%[email protected]%' OR requirements LIKE '%[email protected]%'`;

  console.log(`\nRemaining across ALL 16,864 jobs:`);
  console.log(`  - Missing employer_url: ${nullEmp.count}`);
  console.log(`  - Missing requirements: ${nullReq.count}`);
  console.log(`  - [email protected]:    ${hasCf.count}`);

  await sql.end();
}

cleanAllJobs().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
