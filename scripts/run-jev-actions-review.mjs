import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));

const { TypeSafeClient, choice, noul, score } = require('@typesafe-ai/sdk');
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

if (!process.env.TYPESAFE_API_KEY) {
  console.error('Error: TYPESAFE_API_KEY is not set');
  process.exit(1);
}

const client = new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY.trim() });

async function reviewWithJev(filename, content) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Analyzing [${filename}] with Jev System One...`);
  console.log('='.repeat(70));

  const result = await client.systemOne(
    {
      state: `GITHUB ACTIONS FILE: ${filename}\n\nCONTENT:\n${content}`,
      questions: {
        hasIssues: noul(
          'Does this GitHub Actions workflow have critical bugs, security risks, missing secrets, concurrency issues, or optimization flaws?',
          {
            true: 'Yes, it has significant flaws, missing secrets/caching, concurrency risks, or bad practices that need fixing',
            false: 'No, it is robust, secure, production-ready, well-structured, with concurrency and timeouts properly handled',
          }
        ),
        qualityScore: score(
          'Score the quality, reliability, and security of this GitHub Actions workflow (0=Critically flawed, 1=Suboptimal, 2=Good, 3=Exemplary):',
          [
            'Critically flawed: missing critical secrets, broken steps, unsafe secrets, or non-functional',
            'Suboptimal: missing timeouts, missing npm caching, race conditions in git push, missing env vars',
            'Good: functional and mostly secure with minor optimizations possible',
            'Exemplary: production-hardened, caching, concurrency control, safe git operations, strict timeouts',
          ]
        ),
        primaryStatus: choice(
          'Determine the overall status of this workflow after review:',
          {
            production_ready: 'Workflow has timeouts, concurrency guards, proper caching, safe git operations, and complete secrets',
            needs_minor_tweak: 'Workflow is functional but has small cosmetic or secondary enhancements possible',
            needs_major_fix: 'Workflow has critical missing secrets, race conditions, or security liabilities',
          }
        ),
      },
    },
    { timeout: 15_000 }
  );

  const answers = result.answers;
  const hasIssuesProb = answers.hasIssues?.noul ?? 0.5;
  const qScore = answers.qualityScore?.score ?? 1;
  const qLevels = ['Critically flawed', 'Suboptimal', 'Good', 'Exemplary'];
  const levelText = qLevels[Math.round(qScore)] || 'Good';
  const status = answers.primaryStatus?.choice || 'unknown';

  console.log(`Results for ${filename}:`);
  console.log(`  - Has Issues Probability: ${(hasIssuesProb * 100).toFixed(1)}%`);
  console.log(`  - Quality Score (0-3): ${qScore.toFixed(2)} (${levelText})`);
  console.log(`  - Status: ${status}`);

  return {
    filename,
    hasIssuesProb,
    qualityScore: qScore,
    qualityLevel: levelText,
    status,
  };
}

async function main() {
  console.log('Re-evaluating all GitHub Actions Workflows with Jev System One...\n');

  const files = [
    'ci.yml',
    'data-cleanup-report.yml',
    'mass-scrape.yml',
    'targeted-scrape.yml',
  ];

  const results = [];
  for (const file of files) {
    const filePath = join(projectRoot, '.github/workflows', file);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      const r = await reviewWithJev(file, content);
      results.push(r);
    }
  }

  console.log('\n\n' + '='.repeat(70));
  console.log('JEV POST-FIX VERIFICATION SUMMARY');
  console.log('='.repeat(70));
  for (const r of results) {
    const icon = r.qualityScore >= 2.0 ? '✅' : r.qualityScore >= 1.5 ? '⚠️' : '❌';
    console.log(`  ${icon} ${r.filename.padEnd(25)} | Quality: ${r.qualityScore.toFixed(2)}/3.0 (${r.qualityLevel}) | Status: ${r.status}`);
  }
}

main().catch(console.error);
