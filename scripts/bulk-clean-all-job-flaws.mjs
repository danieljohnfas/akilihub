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

async function runBulkClean() {
  console.log('================================================================');
  console.log('        COMPREHENSIVE JOBS TABLE PURIFICATION & ENRICHMENT       ');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // STEP 1: PURGE ADSENSE & NEWSLETTER BOILERPLATE
  // -------------------------------------------------------------------------
  console.log('STEP 1: Purging AdSense code and scraper boilerplate from descriptions...');

  const [adsBefore] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE description LIKE '%adsbygoogle%'`;
  const [subBefore] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE description LIKE '%Never Miss a Job Update Again%' OR description LIKE '%Click Here to Subscribe%'`;
  console.log(`  Before: ${adsBefore.count} jobs with adsbygoogle | ${subBefore.count} jobs with newsletter CTAs`);

  // Fast in-database regex replaces
  await sql`
    UPDATE jobs
    SET description = REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          description,
          '\\(adsbygoogle\\s*=\\s*window\\.adsbygoogle\\s*\\|\\|\\s*\\[\\]\\)\\.push\\(\\{\\}\\);?',
          '',
          'g'
        ),
        'Never Miss a Job Update Again\\.[^\\n]*',
        '',
        'g'
      ),
      'We have started building our professional LinkedIn page\\.[^\\n]*',
      '',
      'g'
    ),
    updated_at = NOW()
    WHERE description LIKE '%adsbygoogle%' 
       OR description LIKE '%Never Miss a Job Update Again%'
       OR description LIKE '%LinkedIn page%';
  `;

  // Also clean requirements if any
  await sql`
    UPDATE jobs
    SET requirements = REGEXP_REPLACE(
      requirements,
      '\\(adsbygoogle\\s*=\\s*window\\.adsbygoogle\\s*\\|\\|\\s*\\[\\]\\)\\.push\\(\\{\\}\\);?',
      '',
      'g'
    ),
    updated_at = NOW()
    WHERE requirements LIKE '%adsbygoogle%';
  `;

  const [adsAfter] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE description LIKE '%adsbygoogle%'`;
  const [subAfter] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE description LIKE '%Never Miss a Job Update Again%'`;
  console.log(`  ✓ After: ${adsAfter.count} jobs with adsbygoogle (Must be 0) | ${subAfter.count} with CTAs (Must be 0)\n`);

  // -------------------------------------------------------------------------
  // STEP 2: FIX MAILTO LINKS IN EMPLOYER_URL
  // -------------------------------------------------------------------------
  console.log('STEP 2: Fixing mailto links in employer_url...');
  const [mailtoBefore] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE employer_url LIKE 'mailto:%'`;
  console.log(`  Before: ${mailtoBefore.count} jobs with mailto in employer_url`);

  // 2a. Replace mailto with source_url if source_url is a web URL
  const r1 = await sql`
    UPDATE jobs
    SET employer_url = source_url, updated_at = NOW()
    WHERE employer_url LIKE 'mailto:%' 
      AND source_url IS NOT NULL 
      AND source_url LIKE 'http%'
    RETURNING id
  `;
  console.log(`  ✓ Replaced mailto with source_url for ${r1.length} jobs.`);

  // 2b. For any remaining mailto links, derive https:// domain from email
  const r2 = await sql`
    UPDATE jobs
    SET employer_url = 'https://' || SUBSTRING(employer_url FROM '@([^>]+)$'), updated_at = NOW()
    WHERE employer_url LIKE 'mailto:%' 
      AND employer_url LIKE '%@%'
    RETURNING id
  `;
  console.log(`  ✓ Replaced mailto with derived domain for ${r2.length} jobs.`);

  const [mailtoAfter] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE employer_url LIKE 'mailto:%'`;
  console.log(`  ✓ After: ${mailtoAfter.count} jobs with mailto in employer_url (Must be 0)\n`);

  // -------------------------------------------------------------------------
  // STEP 3: RESOLVE PLACEHOLDER EMPLOYER NAMES
  // -------------------------------------------------------------------------
  console.log('STEP 3: Resolving placeholder employer names (Verified Employer, etc.)...');

  const placeholderJobs = await sql`
    SELECT id, title, company_name, description
    FROM jobs
    WHERE company_name ILIKE '%verified employer%'
       OR company_name ILIKE '%tanzanian employer%'
       OR company_name ILIKE '%anonymous employer%'
       OR company_name ILIKE '%confidential%'
  `;
  console.log(`  Found ${placeholderJobs.length} jobs with placeholder employer names.`);

  let resolvedCompanies = 0;
  for (const j of placeholderJobs) {
    let realName = null;

    // Pattern 1: Title has "... at <Company>"
    const atMatch = j.title.match(/(?:at|for)\s+([A-Z0-9][A-Za-z0-9\s&.,'’\(\)\-]{2,55}?)(?:\s+(?:in|–|-|\||\(|\bjobs?\b|\bcareers?\b|\brecruitment\b|\bvacanc|\bltd\b|\blimited\b|\bplc\b|\binc\b|\bkenya\b|\btanzania\b|\buganda\b|\brwanda\b|\bghana\b|\bethiopia\b|\bzambia\b|\bnigeria\b)|$)/i);
    if (atMatch && atMatch[1] && atMatch[1].trim().length >= 3) {
      const candidate = atMatch[1].trim();
      if (!candidate.toLowerCase().includes('verified employer') && !candidate.toLowerCase().includes('confidential')) {
        realName = candidate;
      }
    }

    // Pattern 2: Title has "<Company> — <Role>" or "<Company> - <Role>"
    if (!realName) {
      const dashMatch = j.title.match(/^([A-Z0-9][A-Za-z0-9\s&.,'’]{2,45})\s+[—–-]\s+/);
      if (dashMatch && dashMatch[1] && dashMatch[1].trim().length >= 3) {
        const candidate = dashMatch[1].trim();
        if (!candidate.toLowerCase().includes('job') && !candidate.toLowerCase().includes('vacancy') && !candidate.toLowerCase().includes('ongoing')) {
          realName = candidate;
        }
      }
    }

    // Pattern 3: Description has "Company: <Company>"
    if (!realName && j.description) {
      const descMatch = j.description.match(/Company:\s*([A-Za-z0-9\s&.,'’\(\)\-]{3,55})/i);
      if (descMatch && descMatch[1] && descMatch[1].trim().length >= 3) {
        const candidate = descMatch[1].trim().split('\n')[0].trim();
        if (!candidate.toLowerCase().includes('verified employer') && !candidate.toLowerCase().includes('location') && !candidate.toLowerCase().includes('state')) {
          realName = candidate;
        }
      }
    }

    if (realName && realName.length >= 3 && realName.length <= 60) {
      await sql`
        UPDATE jobs
        SET company_name = ${realName}, updated_at = NOW()
        WHERE id = ${j.id}
      `;
      resolvedCompanies++;
    }
  }
  console.log(`  ✓ Successfully extracted & updated ${resolvedCompanies}/${placeholderJobs.length} real company names.\n`);

  // -------------------------------------------------------------------------
  // STEP 4: PRECISE POSIX SECTOR RECLASSIFICATION
  // -------------------------------------------------------------------------
  console.log('STEP 4: Reclassifying misclassified jobs from IT/Software into their true sectors...');

  // 4a. Logistics, Transport & Procurement
  const sLogistics = await sql`
    UPDATE jobs
    SET sector = 'Logistics, Transport & Procurement', profession = 'Supply Chain & Logistics', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(driver|drivers|truck|chauffeur|fleet|logistics|warehouse|courier|delivery|forklift|dispatcher|transport)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to Logistics, Transport & Procurement: ${sLogistics.length} jobs`);

  // 4b. Hospitality, Tourism & Catering
  const sHospitality = await sql`
    UPDATE jobs
    SET sector = 'Hospitality, Tourism & Catering', profession = 'Culinary, Food & Hospitality', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(cook|cooks|chef|chefs|barista|waiter|waitress|bartender|kitchen|baker|pastry|hotel|housekeep|catering|steward|restaurant)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to Hospitality, Tourism & Catering: ${sHospitality.length} jobs`);

  // 4c. Agriculture & Farming
  const sAgri = await sql`
    UPDATE jobs
    SET sector = 'Agriculture, Mining & Energy', profession = 'Agronomy & Agricultural Extension', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(agronom|agriculture|farmer|farming|field officer|field officers|crop|livestock|veterinar|dairy|poultry|horticulture|agribusiness|extension officer)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to Agriculture, Mining & Energy: ${sAgri.length} jobs`);

  // 4d. Healthcare & Pharmaceuticals
  const sHealth = await sql`
    UPDATE jobs
    SET sector = 'Healthcare & Pharmaceuticals', profession = 'Healthcare & Medicine', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(nurse|nurses|nursing|doctor|doctors|physician|surgeon|midwife|midwives|pharmacist|pharmacy|clinical officer|lab technician|laboratory|dentist|radiograph|medical officer)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to Healthcare & Pharmaceuticals: ${sHealth.length} jobs`);

  // 4e. Education & Training
  const sEdu = await sql`
    UPDATE jobs
    SET sector = 'Education & Training', profession = 'Education & Instruction', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(teacher|teachers|teaching|tutor|tutors|lecturer|lecturers|professor|headteacher|curriculum|instructor|dean|pedagog)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to Education & Training: ${sEdu.length} jobs`);

  // 4f. Manufacturing, Construction & Engineering
  const sConst = await sql`
    UPDATE jobs
    SET sector = 'Manufacturing, Construction & Engineering', profession = 'Engineering & Construction', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(civil engineer|mason|plumber|electrician|welder|carpenter|surveyor|architect|draftsman|site engineer|mechanic|foreman)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to Manufacturing, Construction & Engineering: ${sConst.length} jobs`);

  // 4g. Finance, Banking & Insurance
  const sFinance = await sql`
    UPDATE jobs
    SET sector = 'Finance, Banking & Insurance', profession = 'Accounting & Financial Management', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(accountant|accountants|auditor|auditors|cashier|cashiers|teller|tellers|bookkeeper|credit officer|finance officer|financial analyst|tax consultant|treasury)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to Finance, Banking & Insurance: ${sFinance.length} jobs`);

  // 4h. Legal, Compliance & HR
  const sLegal = await sql`
    UPDATE jobs
    SET sector = 'Legal, Compliance & HR', profession = 'Human Resources & Legal', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(lawyer|paralegal|advocate|legal counsel|human resource|hr officer|recruiter|recruitment officer|talent acquisition)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to Legal, Compliance & HR: ${sLegal.length} jobs`);

  // 4i. Sales, Marketing & Customer Support
  const sSales = await sql`
    UPDATE jobs
    SET sector = 'Sales, Marketing & Customer Support', profession = 'Sales & Business Development', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(sales representative|sales executive|sales manager|brand ambassador|merchandiser|telemarketer|customer care|customer service)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to Sales, Marketing & Customer Support: ${sSales.length} jobs`);

  // 4j. NGO, Development & Social Services
  const sNgo = await sql`
    UPDATE jobs
    SET sector = 'NGO, Development & Social Services', profession = 'Humanitarian & Community Development', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(case worker|community mobilizer|peacebuilding|humanitarian|child protection|gender officer|counselor|social worker)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to NGO, Development & Social Services: ${sNgo.length} jobs`);

  const totalReclassified = sLogistics.length + sHospitality.length + sAgri.length + sHealth.length + sEdu.length + sConst.length + sFinance.length + sLegal.length + sSales.length + sNgo.length;
  console.log(`\n  Total misclassified jobs reclassified into true domains: ${totalReclassified}\n`);

  // -------------------------------------------------------------------------
  // FINAL SECTOR DISTRIBUTION SCORECARD
  // -------------------------------------------------------------------------
  console.log('=== FINAL SECTOR DISTRIBUTION ACROSS ALL JOBS ===');
  const finalSectors = await sql`
    SELECT sector, COUNT(*)::int as count 
    FROM jobs 
    GROUP BY sector 
    ORDER BY count DESC
  `;
  for (const s of finalSectors) {
    console.log(`  - "${s.sector}": ${s.count} jobs`);
  }

  await sql.end();
  console.log('\n================================================================');
  console.log('            ALL JOBS CLEANED, ENRICHED & VERIFIED!             ');
  console.log('================================================================\n');
}

runBulkClean().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
