import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 5, prepare: false });

function cleanTitle(raw) {
  if (!raw) return raw;
  let t = raw.trim();
  // Strip [LINK] and trailing URL
  if (t.startsWith('[LINK]')) {
    t = t.replace(/^\[LINK\]\s*/i, '');
    t = t.replace(/\s*=>\s*https?:\/\/\S+/gi, '');
  }
  if (t.startsWith('http')) {
    try {
      const u = new URL(t);
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1].replace(/[-_]/g, ' ').replace(/\.html?$/i, '');
        t = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
      }
    } catch {}
  }
  // Trim trailing colons or whitespace
  t = t.replace(/\s*:\s*$/, '').trim();
  return t;
}

function extractRenewalPeriod(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/annuel|annuelle|annually|annual|each year|every year|yearly|chaque ann[eé]e/.test(t)) {
    return '365';
  }
  if (/biennial|every 2 years|tous les deux ans/.test(t)) {
    return '730';
  }
  if (/every 3 years|tous les 3 ans/.test(t)) {
    return '1095';
  }
  if (/every 5 years|tous les 5 ans/.test(t)) {
    return '1825';
  }
  if (/quarterly|trimestriel|chaque trimestre/.test(t)) {
    return '90';
  }
  if (/monthly|mensuel|mensuellement|chaque mois/.test(t)) {
    return '30';
  }
  if (/one[- ]off|one[- ]time|once|upon registration|upon incorporation|une seule fois|permanente|lifetime/.test(t)) {
    return '0';
  }
  return null;
}

function extractEstimatedCost(text) {
  if (!text) return null;
  if (/\b(gratuit|free of charge|no fee|zero fee)\b/i.test(text)) {
    return 'Free';
  }

  const match = text.match(/(KES|KSh?|TZS|UGX|RWF|BIF|USD|\$|EUR|€)\s*([\d,]+(?:\.\d{2})?)/i);
  if (match) {
    const curr = match[1].toUpperCase().replace('KSH', 'KES').replace('$', 'USD').replace('€', 'EUR');
    return `${curr} ${match[2]}`;
  }

  const rangeMatch = text.match(/(?:fee|cost|frais|tarif)\s*(?:of|de|between)?\s*([\d,]+)\s*(?:to|-)\s*([\d,]+)\s*(KES|TZS|UGX|RWF|BIF|USD)/i);
  if (rangeMatch) {
    return `${rangeMatch[3].toUpperCase()} ${rangeMatch[1]} - ${rangeMatch[2]}`;
  }

  return null;
}

const COMMON_DOCS = [
  'Certificate of Incorporation',
  'Memorandum and Articles of Association',
  'Tax Compliance Certificate (TCC)',
  'KRA PIN Certificate',
  'TRA Taxpayer Identification Number (TIN)',
  'National Identity Card (ID)',
  'Passport Copy',
  'Passport Photos',
  'Business Permit / Single Business Permit',
  'CR12 Form',
  'Beneficial Ownership Declaration',
  'Lease Agreement or Title Deed',
  'Audited Financial Statements',
  'Bank Statements',
  'NEMA Environmental Impact Assessment (EIA) Certificate',
  'OSHA Compliance Certificate',
  'Fire Safety Certificate',
  'Health Inspection Certificate',
  'NHIF / NSSF Registration',
  'Professional Practice License',
  'Board Resolution'
];

function extractRequiredDocuments(text) {
  if (!text) return [];
  const found = [];
  const lower = text.toLowerCase();

  for (const doc of COMMON_DOCS) {
    const docLower = doc.toLowerCase();
    if (docLower.includes('incorporation') && (lower.includes('incorporation') || lower.includes('registration certificate'))) {
      found.push('Certificate of Incorporation / Registration');
    } else if (docLower.includes('memorandum') && (lower.includes('memorandum') || lower.includes('articles of association') || lower.includes('statuts'))) {
      found.push('Memorandum and Articles of Association');
    } else if (docLower.includes('tax compliance') && (lower.includes('tax compliance') || lower.includes('quitus fiscal') || lower.includes('tcc'))) {
      found.push('Tax Compliance Certificate (TCC)');
    } else if (docLower.includes('pin') && (lower.includes('pin certificate') || lower.includes('tin') || lower.includes('nif') || lower.includes('numéro d’identification fiscal'))) {
      found.push('Tax Identification Number (PIN / TIN / NIF)');
    } else if (docLower.includes('national identity') && (lower.includes('national id') || lower.includes('identity card') || lower.includes('carte nationale d\'identité') || lower.includes('passport copy'))) {
      found.push('National ID / Passport Copies of Directors');
    } else if (docLower.includes('beneficial') && (lower.includes('beneficial owner') || lower.includes('beneficial ownership'))) {
      found.push('Beneficial Ownership Declaration Form');
    } else if (docLower.includes('lease') && (lower.includes('lease agreement') || lower.includes('tenancy agreement') || lower.includes('title deed'))) {
      found.push('Proof of Business Premises (Lease Agreement or Title Deed)');
    } else if (docLower.includes('financial statements') && (lower.includes('financial statement') || lower.includes('audited account') || lower.includes('états financiers'))) {
      found.push('Audited Financial Statements / Bank Statements');
    } else if (docLower.includes('environmental') && (lower.includes('nema') || lower.includes('environmental impact') || lower.includes('environnemental'))) {
      found.push('Environmental Impact Assessment / NEMA License');
    } else if (docLower.includes('fire') && (lower.includes('fire safety') || lower.includes('incendie') || lower.includes('assurance'))) {
      found.push('Fire Safety Certificate / Insurance Policy');
    }
  }

  return [...new Set(found)];
}

function resolveAuthority(row) {
  if (row.issuing_authority && row.issuing_authority !== 'Regulatory Authority') {
    return row.issuing_authority;
  }
  const text = `${row.title} ${row.description} ${row.source_url}`.toLowerCase();
  if (text.includes('obr') || text.includes('burundais des recettes') || text.includes('lerenouveau.bi')) {
    return 'Office Burundais des Recettes (OBR)';
  }
  if (text.includes('kra') || text.includes('kenya revenue authority') || text.includes('itax.kra.go.ke')) {
    return 'Kenya Revenue Authority (KRA)';
  }
  if (text.includes('tra') || text.includes('tanzania revenue authority') || text.includes('tra.go.tz')) {
    return 'Tanzania Revenue Authority (TRA)';
  }
  if (text.includes('ura') || text.includes('uganda revenue authority') || text.includes('ura.go.ug')) {
    return 'Uganda Revenue Authority (URA)';
  }
  if (text.includes('rra') || text.includes('rwanda revenue authority') || text.includes('rra.gov.rw')) {
    return 'Rwanda Revenue Authority (RRA)';
  }
  if (text.includes('brela') || text.includes('brela.go.tz')) {
    return 'Business Registrations and Licensing Agency (BRELA)';
  }
  if (text.includes('brs.go.ke') || text.includes('business registration service')) {
    return 'Business Registration Service (BRS)';
  }
  if (text.includes('rdb') || text.includes('rwanda development board') || text.includes('rdb.rw')) {
    return 'Rwanda Development Board (RDB)';
  }
  if (text.includes('nema') || text.includes('national environment management')) {
    return 'National Environment Management Authority (NEMA)';
  }
  if (text.includes('osha') || text.includes('occupational safety')) {
    return 'Occupational Safety and Health Authority (OSHA)';
  }
  return row.issuing_authority || 'Relevant Regulatory Authority';
}

function fmtArray(arr) {
  return `{${arr.map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;
}

async function runPass2() {
  console.log('=== PASS 2: COMPLIANCE REQUIREMENTS ENRICHMENT ===\n');

  const rows = await sql`
    SELECT id, title, description, category, issuing_authority, renewal_period_days, estimated_cost, required_documents, source_url, country_id
    FROM compliance_requirements
  `;

  console.log(`Loaded ${rows.length} compliance requirements for review and enrichment.`);

  let titlesCleaned = 0;
  let renewalsSet = 0;
  let costsSet = 0;
  let docsSet = 0;
  let authoritiesResolved = 0;
  let totalUpdated = 0;

  const preparedUpdates = [];
  for (const row of rows) {
    const fullText = `${row.title}\n${row.description || ''}`;

    // 1. Clean Title
    let title = cleanTitle(row.title);
    if (title !== row.title) titlesCleaned++;

    // 2. Resolve Issuing Authority
    const authority = resolveAuthority(row);
    if (authority !== row.issuing_authority) authoritiesResolved++;

    // 3. Extract Renewal Period
    let renewal = row.renewal_period_days;
    if (!renewal) {
      renewal = extractRenewalPeriod(fullText);
      if (renewal !== null) renewalsSet++;
    }

    // 4. Extract Estimated Cost
    let cost = row.estimated_cost;
    if (!cost) {
      cost = extractEstimatedCost(fullText);
      if (cost !== null) costsSet++;
    }

    // 5. Extract Required Documents
    let docs = row.required_documents && row.required_documents.length > 0 ? row.required_documents : null;
    if (!docs) {
      const extracted = extractRequiredDocuments(fullText);
      if (extracted.length > 0) {
        docs = extracted;
        docsSet++;
      }
    }

    const docsLiteral = docs ? `${fmtArray(docs)}` : null;
    preparedUpdates.push({
      id: row.id,
      title,
      authority,
      renewal,
      cost,
      docsLiteral
    });
  }

  const CONCURRENCY = 20;
  for (let i = 0; i < preparedUpdates.length; i += CONCURRENCY) {
    const slice = preparedUpdates.slice(i, i + CONCURRENCY);
    await Promise.all(slice.map(async (u) => {
      try {
        if (u.docsLiteral) {
          await sql`
            UPDATE compliance_requirements SET
              title = ${u.title},
              issuing_authority = ${u.authority},
              renewal_period_days = ${u.renewal},
              estimated_cost = ${u.cost},
              required_documents = ${u.docsLiteral}::text[],
              last_verified_at = NOW(),
              updated_at = NOW()
            WHERE id = ${u.id}
          `;
        } else {
          await sql`
            UPDATE compliance_requirements SET
              title = ${u.title},
              issuing_authority = ${u.authority},
              renewal_period_days = ${u.renewal},
              estimated_cost = ${u.cost},
              last_verified_at = NOW(),
              updated_at = NOW()
            WHERE id = ${u.id}
          `;
        }
        totalUpdated++;
      } catch (err) {
        if (err.code === '23505') {
          if (u.docsLiteral) {
            await sql`
              UPDATE compliance_requirements SET
                issuing_authority = ${u.authority},
                renewal_period_days = ${u.renewal},
                estimated_cost = ${u.cost},
                required_documents = ${u.docsLiteral}::text[],
                last_verified_at = NOW(),
                updated_at = NOW()
              WHERE id = ${u.id}
            `;
          } else {
            await sql`
              UPDATE compliance_requirements SET
                issuing_authority = ${u.authority},
                renewal_period_days = ${u.renewal},
                estimated_cost = ${u.cost},
                last_verified_at = NOW(),
                updated_at = NOW()
              WHERE id = ${u.id}
            `;
          }
          totalUpdated++;
        } else {
          console.error(`Error on id ${u.id}:`, err.message);
        }
      }
    }));
  }

  console.log('\nEnrichment Results:');
  console.log(`  - Total records processed:        ${rows.length}`);
  console.log(`  - Total records updated:          ${totalUpdated}`);
  console.log(`  - Noisy titles cleaned:           ${titlesCleaned}`);
  console.log(`  - Issuing authorities resolved:   ${authoritiesResolved}`);
  console.log(`  - Renewal periods set:            ${renewalsSet}`);
  console.log(`  - Estimated costs extracted:      ${costsSet}`);
  console.log(`  - Required document sets created: ${docsSet}`);
  console.log(`  - Records verified:               ${totalUpdated}`);

  await sql.end();
  console.log('\nPASS 2 COMPLETE! ✅');
}

runPass2().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
