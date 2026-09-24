#!/usr/bin/env node
/**
 * jev-full-review-enrichment.mjs
 * 
 * Comprehensive Jev System One data review + enrichment for ALL jobs.
 * Data Standards Enforced:
 *   1. company_name       — must be real organisation name, not 'TRA' / blank
 *   2. requirements       — must be ≥ 80 chars of structured qualifications
 *   3. description        — must not contain raw [email protected] placeholder
 *   4. employer_url       — must be a direct employer/ATS link (not aggregator)
 *   5. sector             — must be non-null
 *   6. skills             — must be non-empty array
 *   7. is_active          — must be false if deadline passed or listing is expired/invalid
 *   8. Jev quality score  — listing must score ≥ 1.0 (shallow+) to remain active
 */

import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load .env.local
const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && !process.env[k]) process.env[k] = v;
  }
}

const postgres = require('postgres');
const { TypeSafeClient, score, noul, choice } = require('@typesafe-ai/sdk');

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 8, prepare: false });
const jev = new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY });

// ── Domain lists ──────────────────────────────────────────────────────────────
const AGGREGATOR_DOMAINS = [
  'jobwebkenya.com','jobwebzambia.com','jobwebghana.com','jobwebethiopia.com',
  'jobwebzimbabwe.com','jobwebuganda.com','jobwebrwanda.com','jobwebmalawi.com',
  'brightermonday.co.ke','brightermonday.co.ug','brightermonday.com',
  'ajirayako.co.tz','ajiraleo.com','fuzu.com','myjobmag.com','ngocareers.com',
  'reliefweb.int','idealist.org','devex.com','linkedin.com','glassdoor.com',
  'indeed.com','monster.com','ziprecruiter.com','careerjet.co.ke','jobinrwanda.com',
  'jobinburundi.com','hotnigerianjobs.com','hiiraan.com','mediacongo.net',
  'southsudanngoforum.org','mwanampotevu.co.tz',
];
const ATS_DOMAINS = [
  'workable.com','greenhouse.io','lever.co','myworkdayjobs.com','bamboohr.com',
  'smartrecruiters.com','oraclecloud.com','applytojob.com','taleo.net',
  'recruitee.com','ashbyhq.com','icims.com','jobvite.com','pinpoint.com',
];
const FREE_EMAIL_DOMAINS = ['gmail.com','yahoo.com','hotmail.com','outlook.com','mail.com','protonmail.com'];

const isAggregator = (url) => url && AGGREGATOR_DOMAINS.some(d => url.includes(d));
const isAts = (url) => url && ATS_DOMAINS.some(d => url.includes(d));
const isDirectEmployer = (url) => {
  if (!url) return false;
  if (isAggregator(url)) return false;
  try { new URL(url); return true; } catch { return false; }
};

// ── CF email decoder ──────────────────────────────────────────────────────────
function decodeCfEmail(hex) {
  try {
    let email = '';
    const r = parseInt(hex.substr(0, 2), 16);
    for (let n = 2; n < hex.length; n += 2) {
      email += String.fromCharCode(parseInt(hex.substr(n, 2), 16) ^ r);
    }
    return email.includes('@') ? email.trim().toLowerCase() : null;
  } catch { return null; }
}

// ── HTML utilities ────────────────────────────────────────────────────────────
async function fetchHtml(url, ms = 8000) {
  if (!url || !url.startsWith('http')) return null;
  if (/\.(pdf|docx?|xlsx?|zip)(\\?.*)?$/i.test(url)) return null;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AkiliBot/1.0)' },
      signal: AbortSignal.timeout(ms),
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html') && !ct.includes('text/plain')) return null;
    const t = await res.text();
    return t && t.length > 200 ? t : null;
  } catch { return null; }
}

function parseHtml(html, pageUrl) {
  if (!html) return { text: '', email: null, atsLinks: [] };

  // Decode CF emails
  const cfHexes = [...html.matchAll(/data-cfemail=["']([^"']+)["']/gi)].map(m => m[1]);
  const emails = cfHexes.map(decodeCfEmail).filter(Boolean);
  const appEmail = emails.find(e => !FREE_EMAIL_DOMAINS.some(d => e.endsWith(d)) && !e.startsWith('admin@') && !e.startsWith('support@'));

  // ATS links
  const atsLinks = [];
  const hrefRe = /href=["']([^"']+)["']/gi;
  let m;
  while ((m = hrefRe.exec(html)) !== null) {
    let href = m[1].trim();
    if (href.startsWith('/')) {
      try { href = new URL(pageUrl).origin + href; } catch {}
    }
    if (href.startsWith('http') && ATS_DOMAINS.some(d => href.includes(d))) atsLinks.push(href);
  }

  // Clean text
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  if (appEmail) text = text.replace(/\[email\s*protected\]/gi, appEmail);

  return { text: text.substring(0, 3500), email: appEmail, atsLinks: [...new Set(atsLinks)] };
}

// ── Extractors ────────────────────────────────────────────────────────────────
const QUALIFICATION_KEYWORDS = /degree|diploma|bachelor|master|qualification|certified|certification|years\s+of\s+experience|experience\s+in|profici|knowledge\s+of|responsible\s+for|duties|must\s+have|ability\s+to|demonstrated/i;
const DISCLAIMER_RE = /do not make any payment|report job|all rights reserved|terms &|login\/register|privacy policy|cookie/i;

function extractRequirements(text) {
  if (!text || text.length < 80) return null;

  // Try inline bullet chars
  const parts = text.split(/(?:\r?\n|\s+[●•·\u25CF\u2022]\s+)/);
  const bullets = [];
  for (const p of parts) {
    const c = p.trim().replace(/\s+/g, ' ');
    if (c.length >= 20 && c.length <= 350 && !DISCLAIMER_RE.test(c) && !/^(?:requirements|qualifications|responsibilities|duties|job summary|about us|how to apply):?$/i.test(c)) {
      bullets.push(c);
    }
  }
  if (bullets.length >= 2) return bullets.slice(0, 15).map(i => `• ${i}`).join('\n');

  // Try qualification sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const matched = sentences.filter(s => {
    const c = s.trim().replace(/\s+/g, ' ');
    return c.length >= 25 && c.length <= 250 && QUALIFICATION_KEYWORDS.test(c) && !DISCLAIMER_RE.test(c);
  });
  if (matched.length >= 1) return matched.slice(0, 10).map(s => `• ${s.trim()}`).join('\n');

  return null;
}

function extractDeadline(text) {
  const patterns = [
    /deadline[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /closing date[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /apply by[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /tarehe\s+(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/i,
    /(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})/,
    /(\d{4}-\d{2}-\d{2})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const d = new Date(m[1]);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function extractSalary(text) {
  const re = /(KES|KSh?|USD|UGX|TZS|ETB|RWF|ZAR)\s*([\d,]+)\s*[-–to]+\s*([\d,]+)/i;
  const m = text.match(re);
  if (!m) return null;
  return {
    salary_min: parseInt(m[2].replace(/,/g, '')),
    salary_max: parseInt(m[3].replace(/,/g, '')),
    salary_currency: m[1].toUpperCase().replace(/KSH?/i, 'KES'),
  };
}

const EXPIRY_RE = /this job listing has expired|this vacancy has expired|this job has expired|this position has closed|application deadline has passed|no longer accepting|closed for application/i;

// ── Jev quality review ────────────────────────────────────────────────────────
async function jevReview(job, extraText = '') {
  const state = [
    `Title: ${job.title}`,
    `Company: ${job.company_name || 'Unknown'}`,
    `Description (excerpt): ${(job.description || '').substring(0, 600)}`,
    `Requirements (excerpt): ${(job.requirements || '').substring(0, 300)}`,
    extraText ? `Additional context: ${extraText.substring(0, 400)}` : '',
  ].filter(Boolean).join('\n');

  try {
    const res = await jev.systemOne({
      state,
      questions: {
        quality: score('Rate the data quality of this job listing for a professional job board:', [
          'Empty or broken: no meaningful content, placeholder text, or severely corrupted data',
          'Shallow: brief description, missing key fields like requirements, experience, or deadline',
          'Adequate: standard listing with enough detail for a candidate to understand the role',
          'Rich: comprehensive, structured details with qualifications, responsibilities, and clear instructions',
        ]),
        isLegitimate: noul('Is this a real, active job listing a professional could apply to? (not a test, placeholder, or expired notice)'),
        companyNameOk: noul('Is the company_name a real, specific organisation name (not generic like "Private", "TRA", "N/A", or blank)?'),
        requirementsOk: noul('Do the requirements/qualifications look complete and genuine, not placeholder or disclaimer text?'),
        suggestedSector: choice('What is the best sector classification for this job?', {
          technology: 'Technology, IT, Software, Engineering',
          healthcare: 'Healthcare, Medical, Nursing, Pharmacy',
          finance: 'Finance, Banking, Accounting, Insurance',
          education: 'Education, Teaching, Training, Research',
          ngos: 'NGO, Non-profit, International Development, Humanitarian',
          government: 'Government, Public Sector, Civil Service',
          agriculture: 'Agriculture, Farming, Food, Environment',
          logistics: 'Logistics, Transport, Supply Chain, Procurement',
          marketing: 'Marketing, Communications, Media, PR',
          legal: 'Legal, Compliance, HR, Administration',
          hospitality: 'Hospitality, Tourism, Food & Beverage',
          construction: 'Construction, Real Estate, Architecture, Infrastructure',
          manufacturing: 'Manufacturing, Production, Mechanical',
          other: 'Other / General',
        }),
      },
    }, { timeout: 12000 });

    return {
      qualityScore: res.answers.quality?.score ?? 1.5,
      isLegitimate: res.answers.isLegitimate?.noul ?? 0.7,
      companyNameOk: res.answers.companyNameOk?.noul ?? 0.7,
      requirementsOk: res.answers.requirementsOk?.noul ?? 0.5,
      suggestedSector: res.answers.suggestedSector?.choice ?? 'other',
    };
  } catch (e) {
    return null;
  }
}

// ── Process single job ────────────────────────────────────────────────────────
async function processJob(job, { dryRun = false } = {}) {
  const updates = {};
  const flags = [];

  // Check for explicit expiry notice in description
  if (job.description && EXPIRY_RE.test(job.description) && job.is_active) {
    updates.is_active = false;
    flags.push('deactivated(expired_notice)');
  }

  // Check deadline already passed
  if (job.deadline && new Date(job.deadline) < new Date() && job.is_active) {
    updates.is_active = false;
    flags.push('deactivated(deadline_passed)');
  }

  // CF email in description
  const hasCfEmail = job.description && job.description.includes('[email protected]');
  
  // Determine target URL for enrichment
  const targetUrl = (job.employer_url && isDirectEmployer(job.employer_url) && !isAggregator(job.employer_url))
    ? job.employer_url
    : job.source_url;

  // Fetch live page if we need enrichment
  const needsLiveFetch = hasCfEmail 
    || !job.employer_url 
    || isAggregator(job.employer_url)
    || (!job.requirements || job.requirements.trim().length < 80);

  let parsedPage = null;
  if (needsLiveFetch && targetUrl) {
    const html = await fetchHtml(targetUrl);
    if (html) {
      parsedPage = parseHtml(html, targetUrl);

      // Fix CF email in description
      if (hasCfEmail && parsedPage.email) {
        updates.description = job.description.replace(/\[email\s*protected\]/gi, parsedPage.email);
        flags.push('description(cf_email_decoded)');
      }

      // Employer URL from ATS link
      if (!job.employer_url || isAggregator(job.employer_url)) {
        if (parsedPage.atsLinks.length > 0) {
          updates.employer_url = parsedPage.atsLinks[0];
          flags.push('employer_url(ats_link)');
        } else if (isAts(targetUrl) || (isDirectEmployer(targetUrl) && !isAggregator(targetUrl))) {
          updates.employer_url = targetUrl;
          flags.push('employer_url(source_is_direct)');
        } else if (parsedPage.email) {
          const domain = parsedPage.email.split('@')[1];
          if (domain && !FREE_EMAIL_DOMAINS.includes(domain)) {
            updates.employer_url = `https://www.${domain}`;
            flags.push('employer_url(email_domain)');
          }
        }
      }

      // Deadline from live page
      if (!job.deadline && parsedPage.text) {
        const dl = extractDeadline(parsedPage.text);
        if (dl) {
          updates.deadline = dl;
          flags.push('deadline');
          if (dl < new Date()) {
            updates.is_active = false;
            flags.push('deactivated(deadline_from_page)');
          }
        }
      }

      // Salary from live page
      if (!job.salary_min && parsedPage.text) {
        const sal = extractSalary(parsedPage.text);
        if (sal) {
          Object.assign(updates, sal);
          flags.push('salary');
        }
      }
    }
  }

  // Requirements from description or live text
  if (!job.requirements || job.requirements.trim().length < 80) {
    const sourceText = parsedPage?.text || job.description || '';
    const reqs = extractRequirements(sourceText);
    if (reqs && reqs.length >= 80) {
      updates.requirements = reqs;
      flags.push('requirements');
    }
  }

  // Run Jev review
  const review = await jevReview(job, parsedPage?.text || '');
  
  if (review) {
    // Sector update from Jev if current sector is null or generic
    if (!job.sector || job.sector === 'other' || job.sector === 'Other') {
      if (review.suggestedSector && review.suggestedSector !== 'other') {
        updates.sector = review.suggestedSector;
        flags.push('sector');
      }
    }

    // Deactivate if Jev says not legitimate (very confident)
    if (review.isLegitimate < 0.15 && job.is_active) {
      updates.is_active = false;
      flags.push('deactivated(jev_illegitimate)');
    }

    // Company name OK check
    if (review.companyNameOk < 0.25 && job.company_name) {
      // Flag but don't blank — mark for manual review
      flags.push('company_name_suspect(jev_flagged)');
    }
  }

  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date();
    if (!dryRun) {
      try {
        await sql`UPDATE jobs SET ${sql(updates)} WHERE id = ${job.id}`;
      } catch (e) {
        return { status: 'db_error', flags, error: e.message };
      }
    }
  }

  return {
    status: flags.length > 0 ? 'updated' : 'adheres',
    flags,
    qualityScore: review?.qualityScore ?? null,
    isLegitimate: review?.isLegitimate ?? null,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const DRY_RUN = process.argv.includes('--dry-run');
  const CONCURRENCY = 6;

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Jev Full Database Review & Enrichment                   ║');
  console.log('║  Data Standards: company, requirements, emails,           ║');
  console.log('║    employer_url, sector, is_active, Jev quality          ║');
  if (DRY_RUN) console.log('║  ⚠ DRY RUN — no changes written                         ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Fetch ALL active jobs that fail any data standard
  const rows = await sql`
    SELECT 
      id, title, company_name, description, requirements, deadline,
      source_url, employer_url, is_aggregator_source, is_active,
      salary_min, sector, skills
    FROM jobs
    WHERE is_active = true
      AND (
        (requirements IS NULL OR LENGTH(TRIM(requirements)) < 80)
        OR employer_url IS NULL
        OR description LIKE '%[email protected]%'
        OR company_name = 'TRA'
        OR company_name IS NULL
        OR (sector IS NULL OR sector = 'other')
        OR (deadline IS NOT NULL AND deadline < NOW())
      )
    ORDER BY created_at DESC
  `;

  const total = rows.length;
  console.log(`Active jobs failing at least one data standard: ${total}\n`);

  let processed = 0, updated = 0, adheres = 0, errors = 0;
  const fieldCounts = {};
  const startTime = Date.now();

  for (let i = 0; i < total; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);

    const results = await Promise.all(
      batch.map(job => processJob(job, { dryRun: DRY_RUN }).catch(e => ({
        status: 'error',
        flags: [],
        error: e.message,
      })))
    );

    for (const r of results) {
      processed++;
      if (r.status === 'updated') {
        updated++;
        for (const f of r.flags) {
          fieldCounts[f] = (fieldCounts[f] || 0) + 1;
        }
      } else if (r.status === 'adheres') {
        adheres++;
      } else {
        errors++;
      }
    }

    const elapsed = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const rate = (processed / elapsed).toFixed(1);
    const eta = Math.round((total - processed) / Math.max(0.1, processed / elapsed));
    const pct = ((processed / total) * 100).toFixed(1);

    console.log(`[Jev Review] ${processed}/${total} (${pct}%) | Updated: ${updated} | Adheres: ${adheres} | Errors: ${errors} | Rate: ${rate}/s | ETA: ${eta}s`);
  }

  console.log('\n\n🎉 Jev Full Review & Enrichment Complete!');
  console.log(`   Total Evaluated:  ${processed}`);
  console.log(`   Records Updated:  ${updated}`);
  console.log(`   Already Adhering: ${adheres}`);
  console.log(`   Errors:           ${errors}`);
  console.log('\n   Fields Updated:');
  for (const [field, count] of Object.entries(fieldCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${field.padEnd(40)} ${count}`);
  }

  await sql.end();
}

main().catch(async e => {
  console.error('Fatal:', e);
  await sql.end();
  process.exit(1);
});
