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

async function runFastDeadlines() {
  console.log('================================================================');
  console.log('      FAST SQL-BASED DEADLINE ENRICHMENT & LIFECYCLE AUDIT      ');
  console.log('================================================================\n');

  const [initialMissing] = await sql`
    SELECT COUNT(*)::int as c FROM jobs WHERE is_active = true AND deadline IS NULL
  `;
  console.log(`Active jobs missing deadline before: ${initialMissing.c}\n`);

  // Step 1: For any active job missing deadline, set deadline to posted_date + 30 days
  // (or created_at + 30 days if posted_date is NULL)
  const r1 = await sql`
    UPDATE jobs
    SET deadline = COALESCE(posted_date, created_at, NOW()) + INTERVAL '30 days',
        updated_at = NOW()
    WHERE is_active = true AND deadline IS NULL
    RETURNING id
  `;
  console.log(`✓ Populated standardized 30-day deadline for ${r1.length} active jobs without deadlines.`);

  // Step 2: Now audit active jobs: any job whose deadline is before NOW() must be deactivated
  const r2 = await sql`
    UPDATE jobs
    SET is_active = false,
        updated_at = NOW()
    WHERE is_active = true AND deadline < NOW()
    RETURNING id
  `;
  console.log(`✓ Deactivated ${r2.length} expired jobs whose deadlines have elapsed.`);

  // Verification checks
  const [missingAfter] = await sql`
    SELECT COUNT(*)::int as c FROM jobs WHERE is_active = true AND deadline IS NULL
  `;
  const [activeNow] = await sql`
    SELECT COUNT(*)::int as c FROM jobs WHERE is_active = true
  `;
  const [inactiveNow] = await sql`
    SELECT COUNT(*)::int as c FROM jobs WHERE is_active = false
  `;

  console.log(`\nActive jobs missing deadline: ${missingAfter.c} (Must be 0)`);
  console.log(`Total active jobs (valid & open): ${activeNow.c}`);
  console.log(`Total archived/expired jobs:      ${inactiveNow.c}`);

  await sql.end();
  console.log('\n================================================================');
  console.log('                  DEADLINE AUDIT COMPLETE                       ');
  console.log('================================================================\n');
}

runFastDeadlines().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
