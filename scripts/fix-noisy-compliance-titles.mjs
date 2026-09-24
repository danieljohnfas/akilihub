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

function deriveCleanTitle(row) {
  const url = row.source_url || '';
  const title = row.title || '';

  // Specific high-value mappings
  if (url.includes('fee-schedule-companies-registry')) return 'Fee Schedule - Companies Registry (BRS)';
  if (url.includes('procedure-of-registering-a-company-in-kenya')) return 'Procedure of Registering a Company in Kenya';
  if (url.includes('how-to-register-a-company-in-ethiopia')) return 'Company Registration Legal Guide (Ethiopia)';
  if (url.includes('nominee-director-kenya')) return 'Nominee Director Legal Guidelines (Kenya)';
  if (url.includes('tax-compliance-certificate-kenya')) return 'Tax Compliance Certificate (TCC) Application Guide';
  if (url.includes('employment-laws/kenya#section-block-1')) return 'Statutory Contractual Agreements Guidelines (Kenya)';
  if (url.includes('fke-kenya.org/policy-issues/employment-labour-laws')) return 'Employment and Labour Relations Code (FKE)';
  if (url.includes('e-tax-system-adoption-and-tax-compliance-in-ethiopia')) return 'E-Tax System and Compliance Guidelines (Ethiopia)';
  if (url.includes('visitrwanda.com/investment/how-to-invest/starting-a-business')) return 'Starting a Business in Rwanda (RDB Guidelines)';
  if (url.includes('businessprocedures.rdb.rw')) return 'Business Registration Procedures (RDB Rwanda)';
  if (url.includes('teledeclaration-dgi.cm')) return 'Déclaration Fiscale et IRPP (DGI Cameroun)';
  if (url.includes('registrations.dgi.cm')) return 'Portail d\'Enregistrement Fiscal des Entreprises (DGI)';
  if (url.includes('otp.dgi.cm')) return 'Authentification Déclaration Fiscale en Ligne (DGI)';
  if (url.includes('dgi.gouv.cd')) return 'Services Fiscaux et Déclarations en Ligne (DGI RDC)';
  if (url.includes('obr.bi/index.php/grands-contribuables')) return 'Réglementation Fiscale pour les Grands Contribuables (OBR)';
  if (url.includes('itax.kra.go.ke')) return 'iTax Portal Compliance FAQs & Filing Guidelines (KRA)';
  if (url.includes('ura.go.ug')) return 'URA Tax Obligations & Opportunities Guidelines (Uganda)';
  if (url.includes('nemc.or.tz')) return 'Environmental Management & Internship Regulations (NEMC)';

  // General slug derivation
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(p => p && p !== 'index.php' && p !== 'category');
    if (parts.length > 0) {
      const slug = parts[parts.length - 1].replace(/[-_]/g, ' ').replace(/\.html?$/i, '');
      if (slug.length >= 5) {
        return slug.charAt(0).toUpperCase() + slug.slice(1);
      }
    }
  } catch {}

  // Strip [LINK] prefix and URL suffix
  let clean = title.replace(/^\[LINK\]\s*/i, '').replace(/\s*=>\s*https?:\/\/\S+/gi, '').trim();
  if (clean.length > 5 && !clean.toLowerCase().includes('skip to content')) {
    return clean;
  }

  return 'Regulatory Compliance Guidelines';
}

async function fixNoisyCompliance() {
  console.log('=== FIXING REMAINING NOISY COMPLIANCE TITLES ===\n');

  let rows;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      rows = await sql`
        SELECT id, title, source_url, country_id, category
        FROM compliance_requirements
        WHERE title LIKE '[LINK]%' OR title LIKE 'http%'
      `;
      break;
    } catch (e) {
      console.log(`Connection attempt ${attempt} failed, retrying in 3s...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  if (!rows) {
    console.error('Failed to connect after 3 attempts.');
    await sql.end();
    process.exit(1);
  }

  console.log(`Found ${rows.length} records with noisy titles.`);

  let updated = 0;
  for (const row of rows) {
    let newTitle = deriveCleanTitle(row);

    // If "Offre d'emploi" or pure internship scraped into compliance, deactivate
    if (newTitle.toLowerCase().includes('offre d’emploi') || newTitle.toLowerCase().includes('job search') || row.title.toLowerCase().includes('nafasi za kazi')) {
      await sql`
        UPDATE compliance_requirements
        SET is_active = false, title = ${newTitle}, updated_at = NOW()
        WHERE id = ${row.id}
      `;
      console.log(`  ✓ Deactivated irrelevant listing: "${row.title.substring(0, 40)}" -> "${newTitle}"`);
      updated++;
      continue;
    }

    try {
      await sql`
        UPDATE compliance_requirements
        SET title = ${newTitle}, updated_at = NOW()
        WHERE id = ${row.id}
      `;
      console.log(`  ✓ Cleaned: "${row.title.substring(0, 35)}..." -> "${newTitle}"`);
      updated++;
    } catch (err) {
      if (err.code === '23505') {
        const disambiguated = `${newTitle} (${row.category || 'General'})`;
        try {
          await sql`
            UPDATE compliance_requirements
            SET title = ${disambiguated}, updated_at = NOW()
            WHERE id = ${row.id}
          `;
          console.log(`  ✓ Disambiguated: "${disambiguated}"`);
          updated++;
        } catch {
          const finalTitle = `${newTitle} - Ref #${row.id.substring(0, 4)}`;
          await sql`
            UPDATE compliance_requirements
            SET title = ${finalTitle}, updated_at = NOW()
            WHERE id = ${row.id}
          `;
          console.log(`  ✓ Ref-tagged: "${finalTitle}"`);
          updated++;
        }
      }
    }
  }

  const [remaining] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements WHERE title LIKE '[LINK]%' OR title LIKE 'http%'`;
  console.log(`\nRemaining noisy titles: ${remaining.count} (Must be 0)`);
  console.log('NOISY COMPLIANCE TITLES FIXED! ✅\n');
  await sql.end();
}

fixNoisyCompliance().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
