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

async function reclassifySectors() {
  console.log('================================================================');
  console.log('       PRECISE POSIX RECLASSIFICATION OF MISCLASSIFIED JOBS     ');
  console.log('================================================================\n');

  const [itBefore] = await sql`
    SELECT COUNT(*)::int as count 
    FROM jobs 
    WHERE sector = 'Information Technology & Software'
  `;
  console.log(`IT & Software jobs before reclassification: ${itBefore.count}\n`);

  // 1. Logistics, Transport & Procurement
  const sLogistics = await sql`
    UPDATE jobs
    SET sector = 'Logistics, Transport & Procurement', profession = 'Supply Chain & Logistics', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(driver|drivers|truck|chauffeur|fleet|logistics|warehouse|courier|delivery|forklift|dispatcher|transport)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to Logistics, Transport & Procurement: ${sLogistics.length} jobs`);

  // 2. Hospitality, Tourism & Catering
  const sHospitality = await sql`
    UPDATE jobs
    SET sector = 'Hospitality, Tourism & Catering', profession = 'Culinary, Food & Hospitality', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(cook|cooks|chef|chefs|barista|waiter|waitress|bartender|kitchen|baker|pastry|hotel|housekeep|catering|steward|restaurant)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to Hospitality, Tourism & Catering: ${sHospitality.length} jobs`);

  // 3. Agriculture, Mining & Energy
  const sAgri = await sql`
    UPDATE jobs
    SET sector = 'Agriculture, Mining & Energy', profession = 'Agronomy & Agricultural Extension', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(agronom|agriculture|farmer|farming|field officer|field officers|crop|livestock|veterinar|dairy|poultry|horticulture|agribusiness|extension officer)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to Agriculture, Mining & Energy: ${sAgri.length} jobs`);

  // 4. Healthcare & Pharmaceuticals
  const sHealth = await sql`
    UPDATE jobs
    SET sector = 'Healthcare & Pharmaceuticals', profession = 'Healthcare & Medicine', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(nurse|nurses|nursing|doctor|doctors|physician|surgeon|midwife|midwives|pharmacist|pharmacy|clinical officer|lab technician|laboratory|dentist|radiograph|medical officer)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to Healthcare & Pharmaceuticals: ${sHealth.length} jobs`);

  // 5. Education & Training
  const sEdu = await sql`
    UPDATE jobs
    SET sector = 'Education & Training', profession = 'Education & Instruction', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(teacher|teachers|teaching|tutor|tutors|lecturer|lecturers|professor|headteacher|curriculum|instructor|dean|pedagog)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to Education & Training: ${sEdu.length} jobs`);

  // 6. Manufacturing, Construction & Engineering
  const sConst = await sql`
    UPDATE jobs
    SET sector = 'Manufacturing, Construction & Engineering', profession = 'Engineering & Construction', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(civil engineer|mason|plumber|electrician|welder|carpenter|surveyor|architect|draftsman|site engineer|mechanic|foreman)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to Manufacturing, Construction & Engineering: ${sConst.length} jobs`);

  // 7. Finance, Banking & Insurance
  const sFinance = await sql`
    UPDATE jobs
    SET sector = 'Finance, Banking & Insurance', profession = 'Accounting & Financial Management', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(accountant|accountants|auditor|auditors|cashier|cashiers|teller|tellers|bookkeeper|credit officer|finance officer|financial analyst|tax consultant|treasury)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to Finance, Banking & Insurance: ${sFinance.length} jobs`);

  // 8. Legal, Compliance & HR
  const sLegal = await sql`
    UPDATE jobs
    SET sector = 'Legal, Compliance & HR', profession = 'Human Resources & Legal', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(lawyer|paralegal|advocate|legal counsel|human resource|hr officer|recruiter|recruitment officer|talent acquisition)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to Legal, Compliance & HR: ${sLegal.length} jobs`);

  // 9. Sales, Marketing & Customer Support
  const sSales = await sql`
    UPDATE jobs
    SET sector = 'Sales, Marketing & Customer Support', profession = 'Sales & Business Development', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(sales representative|sales executive|sales manager|brand ambassador|merchandiser|telemarketer|customer care|customer service)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to Sales, Marketing & Customer Support: ${sSales.length} jobs`);

  // 10. NGO, Development & Social Services
  const sNgo = await sql`
    UPDATE jobs
    SET sector = 'NGO, Development & Social Services', profession = 'Humanitarian & Community Development', updated_at = NOW()
    WHERE sector = 'Information Technology & Software'
      AND title ~* '\\y(case worker|community mobilizer|peacebuilding|humanitarian|child protection|gender officer|counselor|social worker)\\y'
    RETURNING id
  `;
  console.log(`  ✓ Reclassified to NGO, Development & Social Services: ${sNgo.length} jobs`);

  const totalReclassified = sLogistics.length + sHospitality.length + sAgri.length + sHealth.length + sEdu.length + sConst.length + sFinance.length + sLegal.length + sSales.length + sNgo.length;
  console.log(`\nTotal misclassified jobs reclassified into true domains: ${totalReclassified}\n`);

  const [itAfter] = await sql`
    SELECT COUNT(*)::int as count 
    FROM jobs 
    WHERE sector = 'Information Technology & Software'
  `;
  console.log(`IT & Software jobs after reclassification: ${itAfter.count}\n`);

  // Final distribution
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
}

reclassifySectors().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
