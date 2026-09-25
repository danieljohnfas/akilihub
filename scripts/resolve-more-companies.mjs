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
  idle_timeout: 120,
  connect_timeout: 60,
});

async function resolveMoreCompanies() {
  console.log('================================================================');
  console.log('       RESOLVING REMAINING PLACEHOLDER EMPLOYER NAMES           ');
  console.log('================================================================\n');

  const [before] = await sql`
    SELECT COUNT(*)::int as c FROM jobs 
    WHERE is_active = true AND (
      company_name ILIKE '%verified employer%' 
      OR company_name ILIKE '%tanzanian employer%' 
      OR company_name ILIKE '%anonymous employer%'
      OR company_name ILIKE '%confidential%'
    )
  `;
  console.log(`Placeholder companies before: ${before.c}\n`);

  // Pass 1: Extract from "at <Company>" using SUBSTRING regex
  const rAt = await sql`
    UPDATE jobs
    SET company_name = TRIM(
      REGEXP_REPLACE(
        SUBSTRING(title FROM '(?i)\\y(?:at|for)\\s+([A-Z0-9][A-Za-z0-9\\s&.,''()\\-]{2,65})$'),
        '\\s*\\b(in\\s+[A-Z][a-z]+|jobs?|careers?|recruitment|vacanc[a-z]*|opportunities)\\b.*$',
        '',
        'i'
      )
    ),
    updated_at = NOW()
    WHERE is_active = true
      AND (
        company_name ILIKE '%verified employer%' 
        OR company_name ILIKE '%tanzanian employer%' 
        OR company_name ILIKE '%anonymous employer%'
        OR company_name ILIKE '%confidential%'
      )
      AND title ~* '\\y(?:at|for)\\s+[A-Z0-9][A-Za-z0-9\\s&.,''()\\-]{2,65}$'
      AND title !~* '\\y(?:at|for)\\s+(?:a|an|the|various|all|our)\\y'
      AND SUBSTRING(title FROM '(?i)\\y(?:at|for)\\s+([A-Z0-9][A-Za-z0-9\\s&.,''()\\-]{2,65})$') IS NOT NULL
      AND LENGTH(TRIM(SUBSTRING(title FROM '(?i)\\y(?:at|for)\\s+([A-Z0-9][A-Za-z0-9\\s&.,''()\\-]{2,65})$'))) BETWEEN 3 AND 65
    RETURNING id
  `;
  console.log(`✓ Resolved via "at/for <Company>" in title: ${rAt.length} jobs`);

  // Pass 2: Extract from description "Company: <Company>"
  const rDesc = await sql`
    UPDATE jobs
    SET company_name = TRIM(
      SPLIT_PART(
        SUBSTRING(description FROM '(?i)Company:\\s*([A-Za-z0-9\\s&.,''()\\-]{3,65})'),
        E'\n',
        1
      )
    ),
    updated_at = NOW()
    WHERE is_active = true
      AND (
        company_name ILIKE '%verified employer%' 
        OR company_name ILIKE '%tanzanian employer%' 
        OR company_name ILIKE '%anonymous employer%'
        OR company_name ILIKE '%confidential%'
      )
      AND description ~* '(?i)Company:\\s*[A-Za-z0-9]'
      AND SUBSTRING(description FROM '(?i)Company:\\s*([A-Za-z0-9\\s&.,''()\\-]{3,65})') !~* '(verified employer|confidential|tanzanian employer|anonymous|location|state|country)'
      AND LENGTH(TRIM(SPLIT_PART(SUBSTRING(description FROM '(?i)Company:\\s*([A-Za-z0-9\\s&.,''()\\-]{3,65})'), E'\n', 1))) BETWEEN 3 AND 60
    RETURNING id
  `;
  console.log(`✓ Resolved via "Company: <Name>" in description: ${rDesc.length} jobs`);

  // Pass 3: Multi-opening titles like "Ongoing Recruitment at <Company> in Ethiopia"
  const rOngoing = await sql`
    UPDATE jobs
    SET company_name = TRIM(
      SUBSTRING(title FROM '(?i)\\b(?:Recruitment|Vacancies|Jobs?)\\s+(?:Ongoing\\s+)?at\\s+([A-Z0-9][A-Za-z0-9\\s&.,''()\\-]{2,55}?)(?:\\s+(?:in\\s+[A-Z]|and\\s+[A-Z]|\\.|\\-|$))')
    ),
    updated_at = NOW()
    WHERE is_active = true
      AND (
        company_name ILIKE '%verified employer%' 
        OR company_name ILIKE '%tanzanian employer%' 
        OR company_name ILIKE '%anonymous employer%'
        OR company_name ILIKE '%confidential%'
      )
      AND title ~* '(?i)\\b(?:Recruitment|Vacancies|Jobs?)\\s+(?:Ongoing\\s+)?at\\s+[A-Z0-9]'
      AND SUBSTRING(title FROM '(?i)\\b(?:Recruitment|Vacancies|Jobs?)\\s+(?:Ongoing\\s+)?at\\s+([A-Z0-9][A-Za-z0-9\\s&.,''()\\-]{2,55}?)(?:\\s+(?:in\\s+[A-Z]|and\\s+[A-Z]|\\.|\\-|$))') IS NOT NULL
      AND LENGTH(TRIM(SUBSTRING(title FROM '(?i)\\b(?:Recruitment|Vacancies|Jobs?)\\s+(?:Ongoing\\s+)?at\\s+([A-Z0-9][A-Za-z0-9\\s&.,''()\\-]{2,55}?)(?:\\s+(?:in\\s+[A-Z]|and\\s+[A-Z]|\\.|\\-|$))'))) BETWEEN 3 AND 60
    RETURNING id
  `;
  console.log(`✓ Resolved via "Recruitment at <Company>" in title: ${rOngoing.length} jobs`);

  // Pass 4: For aggregator roundups (multi-role listings)
  const rRoundups = await sql`
    UPDATE jobs
    SET company_name = CASE 
      WHEN title ~* 'Ethiopia' THEN 'Public & Private Sector Employers (Ethiopia)'
      WHEN title ~* 'Kenya' THEN 'Public & Private Sector Employers (Kenya)'
      WHEN title ~* 'Uganda' THEN 'Public & Private Sector Employers (Uganda)'
      WHEN title ~* 'Tanzania' THEN 'Public & Private Sector Employers (Tanzania)'
      WHEN title ~* 'Rwanda' THEN 'Public & Private Sector Employers (Rwanda)'
      WHEN title ~* 'Ghana' THEN 'Public & Private Sector Employers (Ghana)'
      WHEN title ~* 'Zambia' THEN 'Public & Private Sector Employers (Zambia)'
      WHEN title ~* 'Nigeria' THEN 'Public & Private Sector Employers (Nigeria)'
      ELSE 'Various Verified Employers'
    END,
    updated_at = NOW()
    WHERE is_active = true
      AND (
        company_name ILIKE '%verified employer%' 
        OR company_name ILIKE '%tanzanian employer%' 
        OR company_name ILIKE '%anonymous employer%'
        OR company_name ILIKE '%confidential%'
      )
      AND title ~* '(Vacanc|Jobs Available|Recruitment Ongoing|Recommended Jobs|Positions Open|Graduates Recruitment|Fresh Recruitment)'
    RETURNING id
  `;
  console.log(`✓ Normalized multi-role aggregator roundups: ${rRoundups.length} jobs`);

  const [after] = await sql`
    SELECT COUNT(*)::int as c FROM jobs 
    WHERE is_active = true AND (
      company_name ILIKE '%verified employer%' 
      OR company_name ILIKE '%tanzanian employer%' 
      OR company_name ILIKE '%anonymous employer%'
      OR company_name ILIKE '%confidential%'
    )
  `;
  console.log(`\nPlaceholder companies after: ${after.c} (Reduced from ${before.c})\n`);

  await sql.end();
}

resolveMoreCompanies().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
