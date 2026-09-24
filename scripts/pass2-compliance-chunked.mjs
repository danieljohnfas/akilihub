import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 2,
  prepare: false,
  idle_timeout: 30,
  connect_timeout: 30,
});

function cleanTitle(raw) {
  if (!raw) return raw;
  let t = raw.trim();
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
  return t.replace(/\s*:\s*$/, '').trim();
}

function extractRenewalPeriod(text) {
  if (!text) return null;
  const t = text.substring(0, 3000).toLowerCase();
  if (/annuel|annuelle|annually|annual|each year|every year|yearly|chaque ann[eé]e/.test(t)) return '365';
  if (/biennial|every 2 years|tous les deux ans/.test(t)) return '730';
  if (/every 3 years|tous les 3 ans/.test(t)) return '1095';
  if (/every 5 years|tous les 5 ans/.test(t)) return '1825';
  if (/quarterly|trimestriel|chaque trimestre/.test(t)) return '90';
  if (/monthly|mensuel|mensuellement|chaque mois/.test(t)) return '30';
  if (/one[- ]off|one[- ]time|once|upon registration|upon incorporation|une seule fois|permanente|lifetime/.test(t)) return '0';
  return null;
}

function extractEstimatedCost(text) {
  if (!text) return null;
  const t = text.substring(0, 3000);
  if (/\b(gratuit|free of charge|no fee|zero fee)\b/i.test(t)) return 'Free';
  const match = t.match(/(KES|KSh?|TZS|UGX|RWF|BIF|USD|\$|EUR|€)\s*([\d,]+(?:\.\d{2})?)/i);
  if (match) {
    const curr = match[1].toUpperCase().replace('KSH', 'KES').replace('$', 'USD').replace('€', 'EUR');
    return `${curr} ${match[2]}`;
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
  const lower = text.substring(0, 3000).toLowerCase();

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
  const text = `${row.title} ${(row.description || '').substring(0, 1000)} ${row.source_url}`.toLowerCase();
  if (text.includes('obr') || text.includes('burundais des recettes') || text.includes('lerenouveau.bi')) return 'Office Burundais des Recettes (OBR)';
  if (text.includes('kra') || text.includes('kenya revenue authority') || text.includes('itax.kra.go.ke')) return 'Kenya Revenue Authority (KRA)';
  if (text.includes('tra') || text.includes('tanzania revenue authority') || text.includes('tra.go.tz')) return 'Tanzania Revenue Authority (TRA)';
  if (text.includes('ura') || text.includes('uganda revenue authority') || text.includes('ura.go.ug')) return 'Uganda Revenue Authority (URA)';
  if (text.includes('rra') || text.includes('rwanda revenue authority') || text.includes('rra.gov.rw')) return 'Rwanda Revenue Authority (RRA)';
  if (text.includes('brela') || text.includes('brela.go.tz')) return 'Business Registrations and Licensing Agency (BRELA)';
  if (text.includes('brs.go.ke') || text.includes('business registration service')) return 'Business Registration Service (BRS)';
  if (text.includes('rdb') || text.includes('rwanda development board') || text.includes('rdb.rw')) return 'Rwanda Development Board (RDB)';
  if (text.includes('nema') || text.includes('national environment management')) return 'National Environment Management Authority (NEMA)';
  if (text.includes('osha') || text.includes('occupational safety')) return 'Occupational Safety and Health Authority (OSHA)';
  return row.issuing_authority || 'Relevant Regulatory Authority';
}

function fmtArray(arr) {
  return `{${arr.map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;
}

async function runPass2Chunked() {
  console.log('=== PASS 2: COMPLIANCE REQUIREMENTS (CHUNKED ENRICHMENT) ===\n');

  const [countRes] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements WHERE last_verified_at IS NULL`;
  console.log(`Remaining unverified compliance requirements: ${countRes.count}`);

  const CHUNK_SIZE = 100;
  let totalUpdated = 0;

  while (true) {
    const rows = await sql`
      SELECT id, title, description, category, issuing_authority, renewal_period_days, estimated_cost, required_documents, source_url, country_id
      FROM compliance_requirements
      WHERE last_verified_at IS NULL
      LIMIT ${CHUNK_SIZE}
    `;

    if (rows.length === 0) break;

    for (const row of rows) {
      const fullText = `${row.title}\n${(row.description || '').substring(0, 3000)}`;

      let title = cleanTitle(row.title);
      const authority = resolveAuthority(row);
      const renewal = row.renewal_period_days || extractRenewalPeriod(fullText);
      const cost = row.estimated_cost || extractEstimatedCost(fullText);

      let docs = row.required_documents && row.required_documents.length > 0 ? row.required_documents : null;
      if (!docs) {
        const extracted = extractRequiredDocuments(fullText);
        if (extracted.length > 0) docs = extracted;
      }
      const docsLiteral = docs ? fmtArray(docs) : null;

      try {
        if (docsLiteral) {
          await sql`
            UPDATE compliance_requirements SET
              title = ${title},
              issuing_authority = ${authority},
              renewal_period_days = ${renewal},
              estimated_cost = ${cost},
              required_documents = ${docsLiteral}::text[],
              last_verified_at = NOW(),
              updated_at = NOW()
            WHERE id = ${row.id}
          `;
        } else {
          await sql`
            UPDATE compliance_requirements SET
              title = ${title},
              issuing_authority = ${authority},
              renewal_period_days = ${renewal},
              estimated_cost = ${cost},
              last_verified_at = NOW(),
              updated_at = NOW()
            WHERE id = ${row.id}
          `;
        }
        totalUpdated++;
      } catch (err) {
        if (err.code === '23505') {
          // Unique title collision: keep original title, update all metadata
          if (docsLiteral) {
            await sql`
              UPDATE compliance_requirements SET
                issuing_authority = ${authority},
                renewal_period_days = ${renewal},
                estimated_cost = ${cost},
                required_documents = ${docsLiteral}::text[],
                last_verified_at = NOW(),
                updated_at = NOW()
              WHERE id = ${row.id}
            `;
          } else {
            await sql`
              UPDATE compliance_requirements SET
                issuing_authority = ${authority},
                renewal_period_days = ${renewal},
                estimated_cost = ${cost},
                last_verified_at = NOW(),
                updated_at = NOW()
              WHERE id = ${row.id}
            `;
          }
          totalUpdated++;
        } else {
          console.error(`Error on id ${row.id}:`, err.message);
          // Still mark verified so we don't loop endlessly
          await sql`UPDATE compliance_requirements SET last_verified_at = NOW() WHERE id = ${row.id}`;
        }
      }
    }

    console.log(`[Compliance] Enriched and verified batch. Total updated so far: ${totalUpdated}`);
  }

  const [finalUnverified] = await sql`SELECT COUNT(*)::int as count FROM compliance_requirements WHERE last_verified_at IS NULL`;
  console.log(`\nFinal unverified count: ${finalUnverified.count}`);
  console.log('PASS 2 COMPLETE! ✅\n');
  await sql.end();
}

runPass2Chunked().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
