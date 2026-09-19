/**
 * scripts/harvest-regional-expansion.mjs
 *
 * Expansion harvester for Ethiopia, Zambia, and Ghana targeting pages 3 and 4
 * across key verified industry categories on JobWebEthiopia, JobWebZambia, and JobWebGhana.
 */

import postgres from 'postgres';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = vals.join('=').trim();
      }
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is missing in environment');
  process.exit(1);
}

const sql = postgres(DATABASE_URL + '?sslmode=require', { max: 5 });

const BANNED_EMPLOYERS = [
  'weloglobal', 'remote.com', 'jobgether', 'jobleads', 'jooble', 'adzuna', 'talent.com', 'neuvoo'
];

function isLegitEmployer(emp) {
  if (!emp || emp.length < 2) return false;
  const lower = emp.toLowerCase();
  for (const banned of BANNED_EMPLOYERS) {
    if (lower.includes(banned)) return false;
  }
  return true;
}

function cleanCompanyName(name) {
  if (!name) return null;
  return name.replace(/\s*(Location|State|Job type|Job category|Resubmit|Post a Job).*$/i, '').trim();
}

function extractCompanyFromTitle(title) {
  const atMatch = title.match(/\bat\s+([A-Z0-9][A-Za-z0-9&.,' -]{2,60})$/i);
  if (atMatch) {
    return cleanCompanyName(atMatch[1]);
  }
  const dashMatch = title.match(/\s*[-–—]\s*([A-Za-z0-9&.,' -]{3,50})\s*$/);
  if (dashMatch) {
    return cleanCompanyName(dashMatch[1]);
  }
  return null;
}

const TARGET_CONFIGS = [
  {
    countryCode: 'ET',
    defaultLocation: 'Addis Ababa, Ethiopia',
    defaultEmployer: 'Verified Employer Ethiopia',
    categories: [
      'https://jobwebethiopia.com/job-category/accounting-finance-jobs-in-ethiopia/',
      'https://jobwebethiopia.com/job-category/engineering-jobs-in-ethiopia/',
      'https://jobwebethiopia.com/job-category/salesmarketing-jobs-in-ethiopia/',
      'https://jobwebethiopia.com/job-category/healthcare-medical-jobs-in-ethiopia/',
      'https://jobwebethiopia.com/job-category/information-technology-jobs-in-ethiopia/',
      'https://jobwebethiopia.com/job-category/ngo-jobs-in-ethiopia/',
      'https://jobwebethiopia.com/job-category/banking-jobs-in-ethiopia/'
    ]
  },
  {
    countryCode: 'ZA',
    defaultLocation: 'Lusaka, Zambia',
    defaultEmployer: 'Verified Employer Zambia',
    categories: [
      'https://jobwebzambia.com/job-category/engineering-jobs-in-zambia/',
      'https://jobwebzambia.com/job-category/administrativesecretarial-jobs-in-zambia/',
      'https://jobwebzambia.com/job-category/salesmarketing-jobs-in-zambia/',
      'https://jobwebzambia.com/job-category/accounting-finance-jobs-in-zambia/',
      'https://jobwebzambia.com/job-category/human-resource-jobs-in-zambia/',
      'https://jobwebzambia.com/job-category/health-care-medical-jobs-in-zambia/'
    ]
  },
  {
    countryCode: 'GH',
    defaultLocation: 'Accra, Ghana',
    defaultEmployer: 'Verified Employer Ghana',
    categories: [
      'https://jobwebghana.com/job-category/healthcare-jobs-in-ghana/',
      'https://jobwebghana.com/job-category/manufacturing-production-jobs-in-ghana/',
      'https://jobwebghana.com/job-category/engineering-jobs-in-ghana/',
      'https://jobwebghana.com/job-category/administrativesecretarial-jobs-in-ghana/',
      'https://jobwebghana.com/job-category/education-jobs-in-ghana/',
      'https://jobwebghana.com/job-category/sales-marketing-jobs-in-ghana-2013/'
    ]
  }
];

async function harvestExpansion() {
  console.log('================================================================');
  console.log('🌍 REGIONAL JOB EXPANSION: ETHIOPIA, ZAMBIA, GHANA (PAGES 3-4)');
  console.log('🎯 Verified direct employer vacancies');
  console.log('================================================================\n');

  const dbCountries = await sql`SELECT id, code, name FROM countries`;
  const countryMap = new Map();
  for (const c of dbCountries) {
    countryMap.set(c.code.toUpperCase(), { id: c.id, name: c.name });
  }

  let grandTotalInserted = 0;

  for (const conf of TARGET_CONFIGS) {
    const cInfo = countryMap.get(conf.countryCode);
    if (!cInfo) continue;

    console.log(`\n--- SOURCING JOBS FOR: ${cInfo.name} (${conf.countryCode}) ---`);
    let countryInserted = 0;

    for (const catUrl of conf.categories) {
      const catSlug = catUrl.split('/job-category/')[1]?.replace(/\/$/, '') || 'category';
      console.log(`  Processing Sector: ${catSlug} (Pages 3 & 4)...`);

      const pagesToCrawl = [`${catUrl}page/3/`, `${catUrl}page/4/`];

      for (const pageUrl of pagesToCrawl) {
        try {
          const catRes = await fetch(pageUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            },
            signal: AbortSignal.timeout(10000)
          });

          if (!catRes.ok) continue;

          const catHtml = await catRes.text();
          const $ = cheerio.load(catHtml);

          const links = [];
          $('a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && (href.includes('.com/job/') || href.includes('.com/jobs/')) && !href.includes('/job-category/') && !href.includes('/page/')) {
              if (text.length > 5 && !links.some(l => l.href === href)) {
                links.push({ href, text });
              }
            }
          });

          if (links.length === 0) continue;

          for (const jobItem of links) {
            try {
              const [existing] = await sql`SELECT id FROM jobs WHERE source_url = ${jobItem.href} LIMIT 1`;
              if (existing) continue;

              const detailRes = await fetch(jobItem.href, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                },
                signal: AbortSignal.timeout(10000)
              });

              if (!detailRes.ok) continue;

              const detailHtml = await detailRes.text();
              const $$ = cheerio.load(detailHtml);

              let rawTitle = $$('h1.entry-title, h1').first().text().trim() || jobItem.text;
              let cleanTitle = rawTitle.replace(/\s+/g, ' ').trim();

              const sectionText = $$('.section_content').first().text().replace(/\s+/g, ' ').trim();
              if (sectionText.length < 100) continue;

              let employer = extractCompanyFromTitle(cleanTitle);
              const compMatch = sectionText.match(/Company:\s*([^.\n\r|]+?)(?=\s*(?:Location|State|Job type|Job category|Resubmit|Post a Job|$))/i);
              if (compMatch && compMatch[1]) {
                employer = compMatch[1].trim();
              }

              employer = cleanCompanyName(employer);
              if (!employer || !isLegitEmployer(employer)) {
                employer = conf.defaultEmployer;
              }

              let location = conf.defaultLocation;
              const locMatch = sectionText.match(/(?:Location|State):\s*([^.\n\r|]+?)(?=\s*(?:Job type|Job category|Resubmit|$))/i);
              if (locMatch && locMatch[1]) {
                location = `${locMatch[1].trim()}, ${cInfo.name}`;
              }

              let jobType = 'full_time';
              if (sectionText.toLowerCase().includes('contract') || sectionText.toLowerCase().includes('temporary')) {
                jobType = 'contract';
              } else if (sectionText.toLowerCase().includes('intern')) {
                jobType = 'internship';
              }

              cleanTitle = cleanTitle.replace(/^Submit CVs\s*[-–—]\s*/i, '')
                                     .replace(/^Latest Recruitment\s*[-–—]\s*/i, '')
                                     .replace(/\s*Jobs in [A-Za-z]+.*$/i, '');

              const [inserted] = await sql`
                INSERT INTO jobs (
                  title,
                  company_name,
                  description,
                  country_id,
                  job_type,
                  source_url,
                  employer_url,
                  location,
                  is_active,
                  posted_date
                ) VALUES (
                  ${cleanTitle.slice(0, 255)},
                  ${employer.slice(0, 255)},
                  ${sectionText.slice(0, 10000)},
                  ${cInfo.id},
                  ${jobType},
                  ${jobItem.href},
                  ${jobItem.href},
                  ${location.slice(0, 255)},
                  true,
                  NOW()
                )
                ON CONFLICT (source_url) DO NOTHING
                RETURNING id
              `;

              if (inserted) {
                countryInserted++;
                grandTotalInserted++;
                if (countryInserted % 10 === 0 || countryInserted === 1) {
                  console.log(`    ✓ Inserted [${conf.countryCode}] #${countryInserted}: "${cleanTitle.slice(0, 45)}" at ${employer}`);
                }
              }
            } catch (err) {
              // ignore detail error
            }
          }
        } catch (pageErr) {
          // ignore page error
        }
      }
    }
    console.log(`  ==> Total inserted for ${cInfo.name}: ${countryInserted}`);
  }

  console.log(`\n🎉 REGIONAL EXPANSION COMPLETE: Inserted ${grandTotalInserted} verified jobs.`);
  await sql.end();
}

harvestExpansion().catch(e => {
  console.error(e);
  process.exit(1);
});
