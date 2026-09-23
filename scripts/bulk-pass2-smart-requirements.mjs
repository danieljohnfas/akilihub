import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 5, prepare: false });
const { TypeSafeClient, score } = require('@typesafe-ai/sdk');

const jev = new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY });

const DISCLAIMER_REGEX = /(?:do not make any payment|report job|all rights reserved|terms & conditions|login\/register|privacy policy|cookie policy|disclaimer|scam warning)/i;

const QUALIFICATION_KEYWORDS = /(?:degree|diploma|bachelor|master|qualification|certified|certification|years\s+of\s+experience|experience\s+in|skilled\s+in|proficiency\s+in|proficient\s+in|knowledge\s+of|responsible\s+for|duties\s+include|will\s+be\s+tasked|must\s+have|proven\s+track\s+record|ability\s+to|demonstrated\s+experience|lead\s+and|manage\s+the|support\s+the|design,\s+sales|oversee|ensure\s+compliance|coordinate)/i;

function extractSmartRequirements(text) {
  if (!text || text.trim().length < 50) return null;

  // 1. Try inline bullet separation
  const parts = text.split(/(?:\r?\n|\s+[●•·\u25CF\u2022\u00B7]\s+|\s+o\s+(?=[A-Z])|\s+\d+\.\s+)/);
  const bulletItems = [];

  for (const p of parts) {
    const clean = p.trim().replace(/\s+/g, ' ');
    if (
      clean.length >= 18 && 
      clean.length <= 350 &&
      !DISCLAIMER_REGEX.test(clean) &&
      !/^(?:requirements|qualifications|responsibilities|duties|job summary|about us|how to apply|key duties):?$/i.test(clean)
    ) {
      bulletItems.push(clean);
    }
  }

  const uniqueBullets = Array.from(new Set(bulletItems));
  if (uniqueBullets.length >= 2) {
    return uniqueBullets.slice(0, 15).map(i => `• ${i}`).join('\n');
  }

  // 2. Try sentence-level qualification & responsibility extraction
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const sentenceItems = [];

  for (const s of sentences) {
    const clean = s.trim().replace(/\s+/g, ' ');
    if (
      clean.length >= 25 &&
      clean.length <= 250 &&
      QUALIFICATION_KEYWORDS.test(clean) &&
      !DISCLAIMER_REGEX.test(clean)
    ) {
      sentenceItems.push(clean);
    }
  }

  const uniqueSentences = Array.from(new Set(sentenceItems));
  if (uniqueSentences.length >= 1) {
    return uniqueSentences.slice(0, 10).map(i => `• ${i}`).join('\n');
  }

  return null;
}

async function run() {
  console.log('Starting Pass 2 Smart Requirements & Completeness Enrichment with Jev...\n');

  const rows = await sql`
    SELECT id, title, company_name, description
    FROM jobs
    WHERE is_active = true 
      AND (requirements IS NULL OR LENGTH(TRIM(requirements)) < 20)
    ORDER BY id
  `;

  const total = rows.length;
  console.log(`Total active jobs to evaluate: ${total}`);

  const BATCH_SIZE = 50;
  let processed = 0;
  let enriched = 0;
  let emptyHandled = 0;
  let jevChecked = 0;
  const startTime = Date.now();

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const updates = batch.map(job => {
      const reqs = extractSmartRequirements(job.description);
      return {
        id: job.id,
        requirements: reqs || '', // set empty string if no requirements can be parsed from description
        hasReqs: !!reqs
      };
    });

    // Spot-check with Jev on 1 job per batch that got requirements
    const candidate = updates.find(u => u.hasReqs);
    if (candidate && jevChecked < 50) {
      const orig = batch.find(b => b.id === candidate.id);
      try {
        await jev.systemOne({
          state: `Job: ${orig.title} at ${orig.company_name}\nRequirements:\n${candidate.requirements.substring(0, 500)}`,
          questions: {
            score: score('Rate requirement quality', ['poor', 'fair', 'good', 'excellent'])
          }
        }, { timeout: 6000 });
        jevChecked++;
      } catch {
        // Continue without blocking
      }
    }

    // Bulk update database
    await Promise.all(updates.map(u => sql`
      UPDATE jobs SET
        requirements = ${u.requirements},
        updated_at = NOW()
      WHERE id = ${u.id}
    `));

    processed += batch.length;
    for (const u of updates) {
      if (u.hasReqs) enriched++;
      else emptyHandled++;
    }

    const elapsed = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const rate = (processed / elapsed).toFixed(1);
    const etaSec = Math.round((total - processed) / Math.max(0.1, processed / elapsed));

    console.log(`[Smart Reqs] ${processed}/${total} (${((processed/total)*100).toFixed(1)}%) | Extracted: ${enriched} | Defaulted: ${emptyHandled} | Jev Checked: ${jevChecked} | Rate: ${rate} jobs/s | ETA: ${etaSec}s`);
  }

  console.log(`\n\n🎉 Pass 2 Smart Enrichment Complete!`);
  console.log(`   Total Processed:    ${processed}`);
  console.log(`   Requirements Added: ${enriched}`);
  console.log(`   Reviewed/Cleared:   ${emptyHandled}`);
  console.log(`   Jev Spot Checks:    ${jevChecked}`);

  await sql.end();
}

run().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
