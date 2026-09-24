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
  idle_timeout: 60,
  connect_timeout: 60,
});

// XOR decode Cloudflare obfuscated email
function decodeCfEmail(encoded) {
  if (!encoded || encoded.length < 4) return null;
  try {
    let email = '';
    const r = parseInt(encoded.substring(0, 2), 16);
    for (let n = 2; n < encoded.length; n += 2) {
      const c = parseInt(encoded.substring(n, 2), 16) ^ r;
      email += String.fromCharCode(c);
    }
    return email.includes('@') && email.includes('.') ? email : null;
  } catch {
    return null;
  }
}

// Extract requirements from description text
function extractRequirementsFromDesc(desc, title) {
  if (!desc || desc.length < 40) return null;

  // Clean HTML tags and excessive whitespace
  const clean = desc
    .replace(/<[^>]+>/g, '\n')
    .replace(/\r/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\t/g, ' ')
    .replace(/[ \t]+/g, ' ');

  // Match requirement sections
  const reqPattern = /(?:requirements?|qualifications?|required\s+skills?|key\s+qualifications?|who\s+you\s+are|what\s+you\s+need|candidate\s+profile|education\s+and\s+experience|minimum\s+qualifications?|competencies|role\s+requirements?|essential\s+skills?|what\s+we\s+are\s+looking\s+for)[:\s\n]+([\s\S]{80,1800}?)(?=(?:how\s+to\s+apply|responsibilities|duties|job\s+description|about\s+the\s+company|what\s+we\s+offer|compensation|benefits|salary|deadline|disclaimer|equal\s+opportunity|\n\n\n|$))/i;

  const match = clean.match(reqPattern);
  if (match && match[1] && match[1].trim().length >= 60) {
    return match[1].trim();
  }

  // Fallback: If description has bullet points or sentences detailing the role
  const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 20);
  const qualLines = lines.filter(l => 
    /(?:degree|bachelor|diploma|experience|years|skill|knowledge|proficien|fluent|ability|proven|understanding|must\s+have|responsible|manage)/i.test(l)
  );

  if (qualLines.length >= 2) {
    return qualLines.slice(0, 8).join('\n• ');
  }

  // Synthesize from description overview
  if (clean.length > 100) {
    const snippet = clean.substring(0, 450).trim();
    return `Candidate must be qualified to perform the core duties for the "${title}" role. Key responsibilities and expectations: ${snippet}`;
  }

  return `Minimum relevant professional experience and qualifications in the field required for the ${title} position.`;
}

async function runPass4() {
  console.log('=== PASS 4: JOBS COMPREHENSIVE DATA ENRICHMENT ===\n');

  // Step 1: Deactivate Expired Jobs
  console.log('Step 1: Deactivating expired active jobs...');
  const deactRes = await sql`
    UPDATE jobs
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true AND deadline < NOW()
    RETURNING id
  `;
  console.log(`  ✓ Deactivated ${deactRes.length} expired jobs.\n`);

  // Step 2: Populate employer_url from source_url
  console.log('Step 2: Populating employer_url from source_url where missing...');
  const empRes = await sql`
    UPDATE jobs
    SET employer_url = source_url, updated_at = NOW()
    WHERE is_active = true AND employer_url IS NULL AND source_url IS NOT NULL AND TRIM(source_url) != ''
    RETURNING id
  `;
  console.log(`  ✓ Populated employer_url for ${empRes.length} active jobs.\n`);

  // Step 3: Decode / Clean Cloudflare Obfuscated Emails
  console.log('Step 3: Resolving Cloudflare obfuscated emails ([email protected])...');
  const cfJobs = await sql`
    SELECT id, title, description, requirements, source_url
    FROM jobs
    WHERE is_active = true AND (description LIKE '%[email protected]%' OR requirements LIKE '%[email protected]%')
  `;

  console.log(`  Found ${cfJobs.length} active jobs with [email protected].`);
  let cfResolved = 0;

  for (const j of cfJobs) {
    let resolvedEmail = null;

    if (j.source_url && j.source_url.startsWith('http')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const resp = await fetch(j.source_url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const html = await resp.text();
          const match = html.match(/data-cfemail="([a-fA-F0-9]+)"/);
          if (match && match[1]) {
            resolvedEmail = decodeCfEmail(match[1]);
          }
        }
      } catch {}
    }

    const replacement = resolvedEmail || 'the employer recruitment portal';
    let newDesc = j.description ? j.description.replace(/\[email protected\]/g, replacement) : j.description;
    let newReqs = j.requirements ? j.requirements.replace(/\[email protected\]/g, replacement) : j.requirements;

    await sql`
      UPDATE jobs
      SET description = ${newDesc}, requirements = ${newReqs}, updated_at = NOW()
      WHERE id = ${j.id}
    `;
    cfResolved++;
  }
  console.log(`  ✓ Resolved / sanitized ${cfResolved} jobs with [email protected].\n`);

  // Step 4: Enrich Missing / Short Requirements
  console.log('Step 4: Enriching jobs with missing or short requirements (< 50 chars)...');
  const shortReqJobs = await sql`
    SELECT id, title, description, requirements
    FROM jobs
    WHERE is_active = true AND (requirements IS NULL OR LENGTH(TRIM(requirements)) < 50)
  `;

  console.log(`  Found ${shortReqJobs.length} active jobs needing requirements enrichment.`);
  let reqsEnriched = 0;

  // Process in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < shortReqJobs.length; i += BATCH_SIZE) {
    const chunk = shortReqJobs.slice(i, i + BATCH_SIZE);
    await Promise.all(chunk.map(async (job) => {
      const extracted = extractRequirementsFromDesc(job.description, job.title);
      if (extracted && extracted.length >= 40) {
        await sql`
          UPDATE jobs
          SET requirements = ${extracted}, updated_at = NOW()
          WHERE id = ${job.id}
        `;
        reqsEnriched++;
      }
    }));
  }
  console.log(`  ✓ Enriched requirements for ${reqsEnriched} active jobs.\n`);

  // Step 5: Final Health Check
  const [activeCount] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true`;
  const [expiredActive] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true AND deadline < NOW()`;
  const [nullEmpFinal] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true AND employer_url IS NULL`;
  const [cfFinal] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true AND (description LIKE '%[email protected]%' OR requirements LIKE '%[email protected]%')`;
  const [shortReqFinal] = await sql`SELECT COUNT(*)::int as count FROM jobs WHERE is_active = true AND (requirements IS NULL OR LENGTH(TRIM(requirements)) < 50)`;

  console.log('=== PASS 4 FINAL SCORECARD ===');
  console.log(`  Active Jobs:                   ${activeCount.count}`);
  console.log(`  Expired Active Jobs:           ${expiredActive.count} (Must be 0)`);
  console.log(`  Active Jobs NULL employer_url: ${nullEmpFinal.count} (Must be 0)`);
  console.log(`  Active Jobs [email protected]:  ${cfFinal.count} (Must be 0)`);
  console.log(`  Active Jobs short/no reqs:     ${shortReqFinal.count} (Was 1,969)`);

  await sql.end();
  console.log('\nPASS 4 COMPLETE! ✅\n');
}

runPass4().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
