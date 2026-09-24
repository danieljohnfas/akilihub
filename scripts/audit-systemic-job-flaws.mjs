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
  idle_timeout: 30,
  connect_timeout: 30,
});

async function findSystemicIssues() {
  console.log('=== SYSTEMIC JOBS AUDIT FOR SIMILAR FLAWS ===\n');

  // 1. Generic placeholder companies
  const placeholders = await sql`
    SELECT company_name, COUNT(*)::int as count
    FROM jobs
    WHERE company_name ILIKE '%verified employer%'
       OR company_name ILIKE '%confidential%'
       OR company_name ILIKE '%anonymous%'
       OR company_name ILIKE '%employer%'
    GROUP BY company_name
    ORDER BY count DESC
    LIMIT 15
  `;
  console.log('Generic placeholder companies:');
  for (const p of placeholders) {
    console.log(`  - "${p.company_name}": ${p.count} jobs`);
  }

  // 2. mailto in employer_url
  const [mailtoCount] = await sql`
    SELECT COUNT(*)::int as count
    FROM jobs
    WHERE employer_url LIKE 'mailto:%'
  `;
  console.log(`\nJobs with mailto in employer_url: ${mailtoCount.count}`);

  // 3. AdSense or newsletter boilerplate in description
  const [adsenseCount] = await sql`
    SELECT COUNT(*)::int as count
    FROM jobs
    WHERE description LIKE '%adsbygoogle%'
  `;
  const [subscribeCount] = await sql`
    SELECT COUNT(*)::int as count
    FROM jobs
    WHERE description LIKE '%Never Miss a Job Update Again%'
       OR description LIKE '%Click Here to Subscribe%'
  `;
  console.log(`Jobs with adsbygoogle in description: ${adsenseCount.count}`);
  console.log(`Jobs with newsletter CTAs in description: ${subscribeCount.count}`);

  // 4. Agriculture/Field jobs wrongly assigned to IT
  const misclassifiedIT = await sql`
    SELECT id, title, company_name, sector
    FROM jobs
    WHERE (sector ILIKE '%Information Technology%' OR sector ILIKE '%Software%')
      AND (
        title ILIKE '%field officer%'
        OR title ILIKE '%agronom%'
        OR title ILIKE '%farmer%'
        OR title ILIKE '%nurse%'
        OR title ILIKE '%driver%'
        OR title ILIKE '%cook%'
        OR title ILIKE '%cleaner%'
        OR title ILIKE '%veterinar%'
      )
    LIMIT 10
  `;
  console.log(`\nSample misclassified into IT sector (${misclassifiedIT.length} found in sample):`);
  for (const m of misclassifiedIT) {
    console.log(`  - [${m.id}] "${m.title}" at "${m.company_name}" -> Sector: ${m.sector}`);
  }

  await sql.end();
}

findSystemicIssues().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
