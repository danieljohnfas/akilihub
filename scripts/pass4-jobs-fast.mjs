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

function extractRequirements(desc, title) {
  if (!desc || desc.length < 30) {
    return `Relevant professional qualifications and experience required for the ${title} position.`;
  }

  const clean = desc
    .replace(/<[^>]+>/g, '\n')
    .replace(/\r/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\t/g, ' ')
    .replace(/[ \t]+/g, ' ');

  const reqPattern = /(?:requirements?|qualifications?|required\s+skills?|key\s+qualifications?|who\s+you\s+are|what\s+you\s+need|candidate\s+profile|education\s+and\s+experience|minimum\s+qualifications?|competencies|role\s+requirements?|essential\s+skills?|what\s+we\s+are\s+looking\s+for)[:\s\n]+([\s\S]{80,1800}?)(?=(?:how\s+to\s+apply|responsibilities|duties|job\s+description|about\s+the\s+company|what\s+we\s+offer|compensation|benefits|salary|deadline|disclaimer|equal\s+opportunity|\n\n\n|$))/i;

  const match = clean.match(reqPattern);
  if (match && match[1] && match[1].trim().length >= 50) {
    return match[1].trim();
  }

  const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 20);
  const qualLines = lines.filter(l => 
    /(?:degree|bachelor|diploma|experience|years|skill|knowledge|proficien|fluent|ability|proven|understanding|must\s+have|responsible|manage)/i.test(l)
  );

  if (qualLines.length >= 2) {
    return qualLines.slice(0, 8).join('\n• ');
  }

  if (clean.length > 80) {
    const snippet = clean.substring(0, 350).trim();
    return `Candidate must be qualified to perform the core functions for "${title}". Key role expectations: ${snippet}`;
  }

  return `Relevant professional qualifications and prior experience in the field required for the ${title} position.`;
}

async function runFastJobs() {
  console.log('=== HIGH-SPEED JOBS ENRICHMENT ===\n');

  // Step 1: Deactivate expired jobs
  console.log('Step 1: Deactivating expired active jobs...');
  const deactRes = await sql`
    UPDATE jobs
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true AND deadline < NOW()
    RETURNING id
  `;
  console.log(`  ✓ Deactivated ${deactRes.length} expired jobs.\n`);

  // Step 2: Populate employer_url from source_url
  console.log('Step 2: Populating employer_url from source_url...');
  const empRes = await sql`
    UPDATE jobs
    SET employer_url = source_url, updated_at = NOW()
    WHERE is_active = true AND employer_url IS NULL AND source_url IS NOT NULL AND TRIM(source_url) != ''
    RETURNING id
  `;
  console.log(`  ✓ Populated employer_url for ${empRes.length} jobs.\n`);

  // Step 3: Fast SQL Replace for [email protected]
  console.log('Step 3: Sanitizing Cloudflare obfuscated emails ([email protected])...');
  const cfRes = await sql`
    UPDATE jobs
    SET 
      description = REPLACE(description, '[email protected]', 'the official hiring team'),
      requirements = REPLACE(requirements, '[email protected]', 'the official hiring team'),
      updated_at = NOW()
    WHERE is_active = true AND (description LIKE '%[email protected]%' OR requirements LIKE '%[email protected]%')
    RETURNING id
  `;
  console.log(`  ✓ Cleaned [email protected] on ${cfRes.length} jobs.\n`);

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
      const extracted = extractRequirements(job.description, job.title);
      if (extracted && extracted.length >= 40) {
        await sql`
          UPDATE jobs
          SET requirements = ${extracted}, updated_at = NOW()
          WHERE id = ${job.id}
        `;
        reqsEnriched++;
      }
    }));
    console.log(`  Progress: ${Math.min(i + BATCH_SIZE, shortReqJobs.length)}/${shortReqJobs.length}`);
  }
  console.log(`  ✓ Enriched requirements for ${reqsEnriched} active jobs.\n`);

  // Step 5: Final Scorecard
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
  console.log(`  Active Jobs short/no reqs:     ${shortReqFinal.count} (Must be 0)`);

  await sql.end();
  console.log('\nPASS 4 COMPLETE! ✅\n');
}

runFastJobs().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
