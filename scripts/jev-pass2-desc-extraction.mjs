import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 8, prepare: false });
const { TypeSafeClient } = require('@typesafe-ai/sdk');

const jev = new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY });

// Use Jev to extract structured requirements from stored description text
async function extractRequirementsWithJev(title, company, description) {
  if (!description || description.trim().length < 100) return null;
  
  try {
    const res = await jev.systemOne({
      state: `
Job Title: ${title}
Company: ${company}
Job Description (full text):
${description.substring(0, 2000)}
      `.trim(),
      questions: {
        extraction: {
          type: 'text',
          instruction: `From the job description above, extract ONLY the requirements, qualifications, and key duties as a concise bullet list. 
Format each item on its own line starting with "• ". 
Include: education level, years of experience, key technical skills, and any certifications required.
If no clear requirements exist in the text, respond with exactly: NONE
Do not invent requirements — only extract what is explicitly stated.`
        }
      }
    }, { timeout: 12000 });
    
    const text = res.answers.extraction?.text || '';
    if (!text || text.trim() === 'NONE' || text.trim().length < 30) return null;
    
    // Validate it actually contains bullet points
    const lines = text.split('\n').filter(l => l.trim().startsWith('•') || l.trim().startsWith('-'));
    if (lines.length < 2) return null;
    
    return lines.map(l => l.trim()).join('\n');
  } catch {
    return null;
  }
}

async function run() {
  console.log('Pass 2: Jev-based requirements extraction from stored descriptions...\n');

  // Target: active jobs still missing requirements but with usable stored description
  const rows = await sql`
    SELECT id, title, company_name, description, source_url
    FROM jobs
    WHERE is_active = true
      AND (requirements IS NULL OR LENGTH(TRIM(requirements)) < 20)
      AND description IS NOT NULL
      AND LENGTH(TRIM(description)) > 150
    ORDER BY LENGTH(description) DESC
  `;

  const total = rows.length;
  console.log(`Total active jobs for Jev description extraction: ${total}`);

  const CONCURRENCY = 6; // Lower concurrency due to Jev API rate
  let processed = 0;
  let requirementsFound = 0;
  const startTime = Date.now();

  for (let i = 0; i < total; i += CONCURRENCY) {
    const chunk = rows.slice(i, i + CONCURRENCY);

    const results = await Promise.all(chunk.map(async (job) => {
      const reqs = await extractRequirementsWithJev(job.title, job.company_name, job.description);
      return { id: job.id, requirements: reqs };
    }));

    const updates = results.filter(r => r.requirements);
    if (updates.length > 0) {
      await Promise.all(updates.map(u => sql`
        UPDATE jobs SET
          requirements = ${u.requirements},
          updated_at = NOW()
        WHERE id = ${u.id}
      `));
      requirementsFound += updates.length;
    }

    processed += chunk.length;
    const elapsed = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const rate = (processed / elapsed).toFixed(1);
    const etaSec = Math.round((total - processed) / Math.max(0.1, processed / elapsed));
    const hitRate = ((requirementsFound / processed) * 100).toFixed(1);

    console.log(`[Jev Pass 2] ${processed}/${total} (${((processed/total)*100).toFixed(1)}%) | Reqs Extracted: ${requirementsFound} | Hit Rate: ${hitRate}% | Rate: ${rate} jobs/s | ETA: ${etaSec}s`);
  }

  console.log(`\n\n🎉 Jev Pass 2 Complete!`);
  console.log(`   Processed:          ${processed}`);
  console.log(`   Requirements Added: ${requirementsFound}`);
  console.log(`   Hit Rate:           ${((requirementsFound/processed)*100).toFixed(1)}%`);

  await sql.end();
}

run().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
