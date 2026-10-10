import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(path.join(process.cwd(), 'package.json'));
const { choice } = require('@typesafe-ai/sdk');
const { systemOne } = require('./scripts/clef-client.mjs');
const jev = { systemOne };

const envPath = path.resolve(process.cwd(), '.env.local');
let dbUrl = '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.trim().startsWith('DATABASE_URL=')) {
      dbUrl = line.split('=').slice(1).join('=').trim();
    }
  }
}
if (!dbUrl) dbUrl = process.env.DATABASE_URL;

const sql = postgres(dbUrl + (dbUrl.includes('?') ? '&sslmode=require' : '?sslmode=require'), { max: 10 });

async function main() {
  console.log('Fetching job categories...');
  const categories = await sql`SELECT id, name FROM job_categories`;
  
  const categoryIdMap = new Map();
  const choiceMap = {};
  for (const c of categories) {
    categoryIdMap.set(c.name, c.id);
    choiceMap[c.name] = c.name;
  }
  
  console.log(`Found ${categories.length} job categories.`);

  console.log('Fetching salary submissions without category...');
  const submissions = await sql`SELECT id, job_title FROM salary_submissions WHERE job_category_id IS NULL`;
  console.log(`Found ${submissions.length} submissions to enrich.`);

  const CONCURRENCY = 5;
  let processed = 0;
  let updated = 0;
  let failed = 0;

  async function processSubmission(sub) {
    try {
      const state = `Job title: "${sub.job_title}"`;
      const result = await jev.systemOne({
        state,
        questions: {
          category: choice("Select the most appropriate job category for this job title.", choiceMap)
        }
      });
      
      const resultName = result?.answers?.category?.choice;
      if (resultName && categoryIdMap.has(resultName)) {
        const categoryId = categoryIdMap.get(resultName);
        await sql`UPDATE salary_submissions SET job_category_id = ${categoryId} WHERE id = ${sub.id}`;
        updated++;
      } else {
        console.log(`[Warning] Could not map "${sub.job_title}". Model returned: "${resultName}"`);
        failed++;
      }
    } catch (e) {
      console.error(`[Error] Failed to process submission ${sub.id} ("${sub.job_title}"): ${e.message}`);
      failed++;
    } finally {
      processed++;
      if (processed % 10 === 0 || processed === submissions.length) {
        console.log(`Progress: ${processed}/${submissions.length}`);
      }
    }
  }

  let index = 0;
  async function worker() {
    while (index < submissions.length) {
      const sub = submissions[index++];
      await processSubmission(sub);
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  console.log('--- Final Stats ---');
  console.log(`Total processed: ${processed}`);
  console.log(`Successfully updated: ${updated}`);
  console.log(`Failed to map/update: ${failed}`);

  await sql.end();
}

main().catch(console.error);
