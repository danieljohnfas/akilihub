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

async function runFinalCleanup() {
  console.log('================================================================');
  console.log('           FINAL CLEANUP: SECTORS & COMPANY NAMES              ');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // STEP 1: Normalize stray/duplicate sector names into canonical ones
  // -------------------------------------------------------------------------
  console.log('STEP 1: Normalizing stray sector name variants...\n');

  const sectorMap = [
    ['Banking & Finance',          'Finance, Banking & Insurance'],
    ['Agriculture & Agribusiness', 'Agriculture, Mining & Energy'],
    ['NGO / Humanitarian',         'NGO, Development & Social Services'],
    ['Media & Communications',     'Sales, Marketing & Customer Support'],
    ['Luxury Goods & Retail',      'Sales, Marketing & Customer Support'],
  ];

  for (const [from, to] of sectorMap) {
    const r = await sql`
      UPDATE jobs
      SET sector = ${to}, updated_at = NOW()
      WHERE sector = ${from}
      RETURNING id
    `;
    if (r.length > 0) {
      console.log(`  ✓ Merged "${from}" (${r.length} jobs) → "${to}"`);
    }
  }

  // -------------------------------------------------------------------------
  // STEP 2: Aggressive SQL-based company extraction from title & description
  // -------------------------------------------------------------------------
  console.log('\nSTEP 2: Extracting real company names from job titles...\n');

  // 2a. Pattern: "Role at <Company>" or "Role for <Company>" in title
  const r2a = await sql`
    UPDATE jobs
    SET company_name = TRIM(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          SUBSTRING(title FROM '(?:(?:at|for)\s+)([A-Z][A-Za-z0-9\s&.,''()\-]{2,50})$'),
          '\s*(–|-|\||\(|in\s+[A-Z]|jobs?|careers?|limited|ltd|plc|kenya|tanzania|uganda|rwanda|ethiopia|ghana|zambia|nigeria).*$',
          '',
          'gi'
        ),
        '^\s+|\s+$',
        '',
        'g'
      )
    ),
    updated_at = NOW()
    WHERE (
      company_name ILIKE '%verified employer%'
      OR company_name ILIKE '%tanzanian employer%'
      OR company_name ILIKE '%anonymous employer%'
      OR company_name ILIKE '%confidential%'
    )
    AND title ~* '\y(at|for)\s+[A-Z][A-Za-z0-9]'
    AND title !~* '\y(at|for)\s+(a|an|the)\y'
    AND LENGTH(
      TRIM(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            SUBSTRING(title FROM '(?:(?:at|for)\s+)([A-Z][A-Za-z0-9\s&.,''()\-]{2,50})$'),
            '\s*(–|-|\||\(|in\s+[A-Z]|jobs?|careers?|limited|ltd|plc|kenya|tanzania|uganda|rwanda|ethiopia|ghana|zambia|nigeria).*$',
            '',
            'gi'
          ),
          '^\s+|\s+$',
          '',
          'g'
        )
      )
    ) BETWEEN 3 AND 60
    RETURNING id
  `;
  console.log(`  ✓ Extracted company from "Role at <Company>" pattern: ${r2a.length} jobs`);

  // 2b. Pattern: "<Company> — <Role>" dash notation in title
  const r2b = await sql`
    UPDATE jobs
    SET company_name = TRIM(SPLIT_PART(title, '—', 1)),
        updated_at = NOW()
    WHERE (
      company_name ILIKE '%verified employer%'
      OR company_name ILIKE '%tanzanian employer%'
      OR company_name ILIKE '%anonymous employer%'
      OR company_name ILIKE '%confidential%'
    )
    AND title LIKE '%—%'
    AND LENGTH(TRIM(SPLIT_PART(title, '—', 1))) BETWEEN 3 AND 60
    AND TRIM(SPLIT_PART(title, '—', 1)) !~* '(job|vacanc|ongoing|excit|opportunit|multip|various|urgent|latest|new opening)'
    RETURNING id
  `;
  console.log(`  ✓ Extracted company from "<Company> — Role" pattern: ${r2b.length} jobs`);

  // 2c. Pattern: Title IS EXACTLY the company name (no action keyword)
  const r2c = await sql`
    UPDATE jobs
    SET company_name = TRIM(title),
        updated_at = NOW()
    WHERE (
      company_name ILIKE '%verified employer%'
      OR company_name ILIKE '%tanzanian employer%'
      OR company_name ILIKE '%anonymous employer%'
      OR company_name ILIKE '%confidential%'
    )
    AND title ~* '(Limited|Ltd|PLC|Bank|Hospital|School|University|Institute|Foundation|Trust|NGO|Agency|Corporation|Group|Holdings|Authority|Company|Organization|Centre|Association)'
    AND title !~* '(job|vacanc|officer|manager|director|coordinator|analyst|specialist|consultant|driver|engineer|accountant|nurse|teacher|recruit|opportunit|opening)'
    AND LENGTH(TRIM(title)) BETWEEN 4 AND 80
    RETURNING id
  `;
  console.log(`  ✓ Extracted company where title IS company name: ${r2c.length} jobs`);

  // -------------------------------------------------------------------------
  // FINAL SCORECARD
  // -------------------------------------------------------------------------
  console.log('\n=== FINAL POST-CLEANUP SCORECARD ===');
  const [ads] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE description LIKE '%adsbygoogle%' OR requirements LIKE '%adsbygoogle%'`;
  const [sub] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE description LIKE '%Never Miss a Job Update Again%'`;
  const [mailto] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE employer_url LIKE 'mailto:%'`;
  const [placeholders] = await sql`
    SELECT COUNT(*)::int as count FROM jobs 
    WHERE company_name ILIKE '%verified employer%' 
       OR company_name ILIKE '%tanzanian employer%' 
       OR company_name ILIKE '%anonymous employer%'
       OR company_name ILIKE '%confidential%'
  `;
  console.log(`  Jobs with AdSense code:        ${ads.count}  ← must be 0`);
  console.log(`  Jobs with newsletter CTAs:     ${sub.count}  ← must be 0`);
  console.log(`  Jobs with mailto in URL:       ${mailto.count}  ← must be 0`);
  console.log(`  Jobs with placeholder company: ${placeholders.count}  (was 1,931)`);

  const sectors = await sql`
    SELECT sector, COUNT(*)::int as count 
    FROM jobs 
    GROUP BY sector 
    ORDER BY count DESC
  `;
  console.log('\n  Sector Distribution:');
  for (const s of sectors) {
    console.log(`    - "${s.sector}": ${s.count} jobs`);
  }

  await sql.end();
  console.log('\n================================================================');
  console.log('                    ALL DONE!                                  ');
  console.log('================================================================\n');
}

runFinalCleanup().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
