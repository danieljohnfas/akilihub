import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const cheerio = require('cheerio');
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 8, prepare: false });
const { TypeSafeClient, score } = require('@typesafe-ai/sdk');

const jev = new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY });

const ATS_DOMAINS = [
  'workable.com', 'greenhouse.io', 'lever.co', 'myworkdayjobs.com',
  'bamboohr.com', 'smartrecruiters.com', 'oraclecloud.com',
  'applytojob.com', 'taleo.net', 'recruitee.com', 'ashbyhq.com',
  'forms.gle', 'typeform.com', 'icims.com', 'jobvite.com',
];

const DISCLAIMER_REGEX = /(?:do not make any payment|report job|scam warning|disclaimer|copyright|all rights reserved|terms of use|cookie policy|terms & conditions|premium cv request)/i;

async function fetchHtml(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractRequirementsAndEmployer(html, currentEmployerUrl, sourceUrl) {
  let discoveredEmployer = currentEmployerUrl;

  // If source_url itself is a direct ATS, set employer_url to it!
  if (!discoveredEmployer && sourceUrl && ATS_DOMAINS.some(d => sourceUrl.toLowerCase().includes(d))) {
    discoveredEmployer = sourceUrl;
  }

  if (!html) return { requirements: null, employerUrl: discoveredEmployer };
  const $ = cheerio.load(html);

  // Remove scripts, styles, nav, footer, sidebar, ads
  $('script, style, nav, footer, header, aside, .ads, .sidebar, iframe, noscript').remove();

  // 1. Direct employer / ATS links discovery
  if (!discoveredEmployer) {
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && ATS_DOMAINS.some(d => href.toLowerCase().includes(d))) {
        discoveredEmployer = href;
      }
    });
  }

  // 2. Structured requirements from list elements with parent-traversal fix
  const items = [];
  const reqHeaders = $('h2, h3, h4, strong, p, b, span').filter((_, el) => {
    const text = $(el).clone().children().remove().end().text().trim().toLowerCase();
    return /(?:requirements|qualifications|experience|what\s+you\s+need|vigezo|duties|responsibilities|key\s+tasks|role\s+purpose|profile|skills)/i.test(text) && text.length <= 60;
  });

  reqHeaders.each((_, h) => {
    let node = $(h);
    // If header is strong/b/span inside a p/div, traverse to parent so sibling lists are found
    if (node.is('strong, b, span') && node.parent().is('p, div, h2, h3, h4')) {
      node = node.parent();
    }

    let next = node.next();
    let count = 0;
    while (next.length && !next.is('h2, h3, h4') && count < 6) {
      if (next.is('ul, ol')) {
        next.find('li').each((_, li) => {
          const t = $(li).text().trim().replace(/\s+/g, ' ');
          if (t.length >= 10 && t.length <= 400 && !DISCLAIMER_REGEX.test(t)) {
            items.push(t);
          }
        });
      } else if (next.is('p')) {
        // Also check if paragraph itself contains bullet points or dash lines
        const pt = next.text().trim();
        if (/^[-*•–—]\s+(.+)/.test(pt)) {
          const clean = pt.replace(/^[-*•–—]\s+/, '').trim();
          if (clean.length >= 10 && clean.length <= 400 && !DISCLAIMER_REGEX.test(clean)) {
            items.push(clean);
          }
        }
      }
      next = next.next();
      count++;
    }
  });

  // Fallback to entry content list items
  if (items.length === 0) {
    $('.entry-content ul li, .job-details ul li, .post-content ul li, article ul li, .description ul li').each((_, li) => {
      const t = $(li).text().trim().replace(/\s+/g, ' ');
      if (t.length >= 15 && t.length <= 300 && !DISCLAIMER_REGEX.test(t)) {
        items.push(t);
      }
    });
  }

  const unique = Array.from(new Set(items));
  const valid = unique.filter(i => !DISCLAIMER_REGEX.test(i));
  const reqText = valid.length >= 2 ? valid.slice(0, 15).map(i => `• ${i}`).join('\n') : null;

  return { requirements: reqText, employerUrl: discoveredEmployer };
}

async function run() {
  console.log('Starting enhanced external requirements & employer enrichment with Jev verification...\n');

  const rows = await sql`
    SELECT id, title, company_name, source_url, employer_url, requirements
    FROM jobs
    WHERE is_active = true
      AND (requirements IS NULL OR LENGTH(TRIM(requirements)) < 20)
      AND source_url IS NOT NULL
    ORDER BY id
  `;

  const total = rows.length;
  console.log(`Total active jobs requiring requirements extraction: ${total}`);

  const CONCURRENCY = 8;
  let processed = 0;
  let requirementsFound = 0;
  let employerUrlsFound = 0;
  let jevEvaluated = 0;
  const startTime = Date.now();

  for (let i = 0; i < total; i += CONCURRENCY) {
    const chunk = rows.slice(i, i + CONCURRENCY);

    const results = await Promise.all(chunk.map(async (job) => {
      const html = await fetchHtml(job.source_url);
      const extracted = extractRequirementsAndEmployer(html, job.employer_url, job.source_url);

      let isValid = false;
      if (extracted.requirements) {
        // Run Jev spot-check validation on 1 in every 10 jobs
        if (processed % 10 === 0) {
          try {
            const res = await jev.systemOne({
              state: `Job: ${job.title} at ${job.company_name}\nRequirements:\n${extracted.requirements.substring(0, 500)}`,
              questions: {
                quality: score('Rate requirement quality', ['poor', 'fair', 'good', 'excellent'])
              }
            }, { timeout: 8000 });
            jevEvaluated++;
            if (res.answers.quality.score >= 1.0) isValid = true;
          } catch {
            isValid = true; // Fallback to accepting parsed bullets
          }
        } else {
          isValid = true;
        }
      }

      return {
        id: job.id,
        requirements: isValid ? extracted.requirements : null,
        employerUrl: extracted.employerUrl,
      };
    }));

    // Update database
    const updates = results.filter(r => r.requirements || r.employerUrl !== rows.find(x => x.id === r.id)?.employer_url);
    if (updates.length > 0) {
      await Promise.all(updates.map(u => sql`
        UPDATE jobs SET
          requirements = COALESCE(${u.requirements}, requirements),
          employer_url = COALESCE(${u.employerUrl}, employer_url),
          updated_at = NOW()
        WHERE id = ${u.id}
      `));

      for (const u of updates) {
        if (u.requirements) requirementsFound++;
        if (u.employerUrl) employerUrlsFound++;
      }
    }

    processed += chunk.length;
    const elapsed = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const rate = (processed / elapsed).toFixed(1);
    const etaSec = Math.round((total - processed) / Math.max(0.1, processed / elapsed));

    console.log(`[Reqs Enricher] ${processed}/${total} (${((processed/total)*100).toFixed(1)}%) | Reqs Extracted: ${requirementsFound} | Employers: ${employerUrlsFound} | Jev Verified: ${jevEvaluated} | Rate: ${rate} jobs/s | ETA: ${etaSec}s`);
  }

  console.log(`\n\n🎉 Requirements & Employer Enrichment Complete!`);
  console.log(`   Processed:          ${processed}`);
  console.log(`   Requirements Added: ${requirementsFound}`);
  console.log(`   Employers Added:    ${employerUrlsFound}`);
  console.log(`   Jev Spot Checks:    ${jevEvaluated}`);

  await sql.end();
}

run().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
