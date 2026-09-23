#!/usr/bin/env node
/**
 * Jev Data Review & Enrichment CLI Runner
 *
 * Usage:
 *   node scripts/run-jev-data-review.mjs [options]
 *
 * Options:
 *   --module=jobs|tenders|compliance|all   Which module to review (default: jobs)
 *   --batch=N                              Records per run (default: 20)
 *   --max=N                                Max records total (default: batch)
 *   --offset=N                             DB offset to start from (default: 0)
 *   --dry-run                              Print what would change without writing to DB
 *   --aggregators-only                     Only process records with is_aggregator_source=true
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ─── Load .env.local ──────────────────────────────────────────────────────────
const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
  console.log('[CLI] Loaded .env.local');
}

// ─── Parse CLI args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name, defaultVal) => {
  const found = args.find(a => a.startsWith(`--${name}=`));
  return found ? found.split('=').slice(1).join('=') : defaultVal;
};
const hasFlag = (name) => args.includes(`--${name}`);

const MODULE = getArg('module', 'jobs');
const BATCH = parseInt(getArg('batch', '20'), 10);
const MAX = parseInt(getArg('max', String(BATCH)), 10);
const OFFSET = parseInt(getArg('offset', '0'), 10);
const DRY_RUN = hasFlag('dry-run');
const AGGREGATORS_ONLY = hasFlag('aggregators-only');
const CORRUPTED_ONLY = hasFlag('corrupted-only') || hasFlag('tra-only');

if (!process.env.DATABASE_URL) {
  console.error('[CLI] ❌ DATABASE_URL not set');
  process.exit(1);
}
if (!process.env.TYPESAFE_API_KEY) {
  console.error('[CLI] ❌ TYPESAFE_API_KEY not set');
  process.exit(1);
}

console.log(`[CLI] ─────────────────────────────────────────────────────────`);
console.log(`[CLI] Jev Data Review & Enrichment`);
console.log(`[CLI]   Module       : ${MODULE}`);
console.log(`[CLI]   Batch        : ${BATCH}`);
console.log(`[CLI]   Max          : ${MAX}`);
console.log(`[CLI]   Offset       : ${OFFSET}`);
console.log(`[CLI]   Dry Run      : ${DRY_RUN}`);
console.log(`[CLI]   Aggr Only    : ${AGGREGATORS_ONLY}`);
console.log(`[CLI] ─────────────────────────────────────────────────────────\n`);

// ─── DB connection ────────────────────────────────────────────────────────────
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { max: 5, idle_timeout: 20 });

// ─── Jev SDK ──────────────────────────────────────────────────────────────────
const { TypeSafeClient, score, noul } = require('@typesafe-ai/sdk');
const jevClient = new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY });

// ─── ATS & Aggregator domain checks ──────────────────────────────────────────
const AGGREGATOR_DOMAINS = [
  'jobwebkenya.com', 'jobwebzambia.com', 'jobwebghana.com',
  'jobwebethiopia.com', 'jobwebzimbabwe.com', 'jobwebuganda.com',
  'brightermonday.co.ke', 'brightermonday.com', 'ajirayako.co.tz',
  'ajiraleo.com', 'fuzu.com', 'myjobmag.com', 'ngocareers.com',
  'reliefweb.int', 'idealist.org', 'devex.com', 'linkedin.com',
  'glassdoor.com', 'indeed.com', 'monster.com', 'ziprecruiter.com',
  'careerjet.co.ke', 'jobfairke.com', 'kenyanemployment.com',
];
const ATS_DOMAINS = [
  'workable.com', 'greenhouse.io', 'lever.co', 'myworkdayjobs.com',
  'bamboohr.com', 'smartrecruiters.com', 'oraclecloud.com',
  'applytojob.com', 'taleo.net', 'recruitee.com', 'ashbyhq.com',
  'forms.gle', 'typeform.com', 'icims.com', 'jobvite.com',
];
const BANNED_EMPLOYER_DOMAINS = [...AGGREGATOR_DOMAINS, 'facebook.com', 'twitter.com', 'instagram.com'];

const isAggregator = (url) => {
  if (!url) return false;
  return AGGREGATOR_DOMAINS.some(d => url.includes(d));
};
const isAts = (url) => {
  if (!url) return false;
  return ATS_DOMAINS.some(d => url.includes(d));
};
const isEmployer = (url) => {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    if (BANNED_EMPLOYER_DOMAINS.some(d => host.includes(d))) return false;
    return true;
  } catch { return false; }
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────
async function fetchHtml(url, timeoutMs = 8000) {
  if (!url || !url.startsWith('http')) return null;

  // Skip direct binary/document files (PDFs, archives, etc.)
  if (/\.(pdf|docx?|xlsx?|pptx?|zip|rar|tar|gz|exe|apk)(\?.*)?$/i.test(url)) {
    return null;
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (
      contentType &&
      !contentType.includes('text/html') &&
      !contentType.includes('application/xhtml+xml') &&
      !contentType.includes('text/plain')
    ) {
      return null;
    }

    const text = await res.text();
    return text && text.length > 100 ? text : null;
  } catch {
    return null;
  }
}

// ─── Cloudflare email decoder ────────────────────────────────────────────────
function decodeCfEmail(cfHex) {
  try {
    let email = '';
    const r = parseInt(cfHex.substr(0, 2), 16);
    for (let n = 2; n < cfHex.length; n += 2) {
      email += String.fromCharCode(parseInt(cfHex.substr(n, 2), 16) ^ r);
    }
    return email.includes('@') ? email.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

// ─── Company extractor from title/text ───────────────────────────────────────
function extractCompanyFromTitleOrText(title, text) {
  if (!title) return null;

  const dashMatch = title.match(/^([A-Za-z0-9&.,'\s]{3,40}?)\s+[—–-]\s+/);
  if (dashMatch && dashMatch[1].trim()) {
    const candidate = dashMatch[1].trim();
    if (!/^(internship|vacancy|job|urgent|hiring|remote|fresh|tenders?|recruitment)/i.test(candidate)) {
      return candidate;
    }
  }

  const atMatch = title.match(/(?:at|for)\s+([A-Za-z0-9&.,'\s]{3,50})$/i);
  if (atMatch && atMatch[1].trim()) {
    return atMatch[1].trim().replace(/\s+(?:Tanzania|Kenya|Uganda|Rwanda|Ethiopia)$/i, '');
  }

  if (text) {
    const orgMatch = text.match(/(?:Organization|Company|Employer)[:\s]+([A-Za-z0-9&.,'\s]{3,50})(?:\n|\r|$)/i);
    if (orgMatch && orgMatch[1].trim()) {
      return orgMatch[1].trim();
    }
  }

  return null;
}

// ─── Simple text & email extractor ───────────────────────────────────────────
function extractTextFromHtml(html) {
  let processed = html;

  // Extract and decode Cloudflare emails
  const cfMatches = [...html.matchAll(/data-cfemail=["']([^"']+)["']/gi)].map(m => m[1]);
  const decodedEmails = [...new Set(cfMatches.map(decodeCfEmail).filter(Boolean))];

  const appEmail = decodedEmails.find(
    e => !e.includes('ajirayako') && !e.includes('jobweb') && !e.includes('brightermonday') && !e.includes('admin@') && !e.includes('support@')
  );

  // Replace data-cfemail spans with decoded text
  processed = processed.replace(/<[^>]*data-cfemail=["']([^"']+)["'][^>]*>.*?<\/[^>]+>/gi, (_, hex) => {
    return decodeCfEmail(hex) || '';
  });

  // Strip tags, collapse whitespace
  let cleanText = processed
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  if (appEmail) {
    cleanText = cleanText.replace(/\[email\s*protected\]/gi, appEmail);
  }

  return {
    text: cleanText.substring(0, 4000),
    appEmail: appEmail || null,
  };
}

function extractAtsLinks(html, pageUrl) {
  const links = [];
  const hrefRe = /href=["']([^"']+)["']/gi;
  let m;
  while ((m = hrefRe.exec(html)) !== null) {
    let href = m[1].trim();
    if (href.startsWith('/')) {
      try {
        const base = new URL(pageUrl);
        href = base.origin + href;
      } catch {}
    }
    if (!href.startsWith('http')) continue;
    if (ATS_DOMAINS.some(d => href.includes(d))) {
      links.unshift(href);
    }
  }
  return [...new Set(links)].filter(u => {
    try { new URL(u); return true; } catch { return false; }
  });
}

function extractRequirementsFromText(text) {
  const lines = text.split('\n');
  const reqHeaders = /requirements|qualifications|what we.*looking for|minimum qualifications|must have|essential/i;
  let capture = false;
  const reqs = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!capture && reqHeaders.test(trimmed)) { capture = true; continue; }
    if (capture) {
      if (/^(responsibilities|what you.*do|about you|benefits|compensation|application|how to apply|equal opportunity)/i.test(trimmed)) break;
      if (trimmed.length > 0) reqs.push(trimmed);
      if (reqs.length >= 20) break;
    }
  }
  return reqs.length >= 2 ? reqs.join('\n') : null;
}

function extractDeadlineFromText(text) {
  const patterns = [
    /deadline[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /closing date[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /apply by[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /due[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const d = new Date(m[1]);
      if (!isNaN(d.getTime()) && d > new Date()) return d;
    }
  }
  return null;
}

function extractSalaryFromText(text) {
  const salaryRe = /(KES|USD|UGX|TZS|ETB|RWF|KSh?|Ksh?|USD?\$?)\s*([\d,]+)\s*[-–to]+\s*([\d,]+)/i;
  const m = text.match(salaryRe);
  if (m) {
    return {
      salaryMin: parseInt(m[2].replace(/,/g, ''), 10),
      salaryMax: parseInt(m[3].replace(/,/g, ''), 10),
      salaryCurrency: m[1].toUpperCase().replace('KSH', 'KES').replace('KSh', 'KES'),
    };
  }
  return { salaryMin: null, salaryMax: null, salaryCurrency: null };
}

// ─── Jev review ───────────────────────────────────────────────────────────────
async function reviewWithJev(stateText) {
  try {
    const res = await jevClient.systemOne(
      {
        state: stateText.substring(0, 4000),
        questions: {
          quality: score('Rate the completeness and quality of this opportunity listing:', [
            'Empty or broken - text is missing, corrupted, or boilerplate with no real details',
            'Shallow - brief description, missing requirements, responsibilities, or dates',
            'Adequate - standard description with core details about the role or tender',
            'Rich - in-depth, structured with comprehensive details and actionable instructions',
          ]),
          isAggregator: noul(
            'Is this listing from an aggregator/directory rather than the direct employer or authority?'
          ),
          isLegitimate: noul(
            'Is this an active, legitimate opportunity that someone can act upon?'
          ),
        },
      },
      { timeout: 10_000 }
    );

    const levels = ['empty', 'shallow', 'adequate', 'rich'];
    const roundedScore = Math.max(0, Math.min(3, Math.round(res.answers.quality.score)));

    return {
      qualityScore: res.answers.quality.score,
      qualityLevel: levels[roundedScore] || 'adequate',
      isAggregatorProb: res.answers.isAggregator.noul ?? 0.5,
      isLegitimateProb: res.answers.isLegitimate.noul ?? 0.5,
    };
  } catch (err) {
    return null;
  }
}

// ─── Core: process a single job row ──────────────────────────────────────────
async function processJobRow(row, { dryRun }) {
  const label = `[${row.title?.substring(0, 40)} @ ${row.company_name || '?'}]`;

  const initialText = [
    `Title: ${row.title}`,
    `Company: ${row.company_name || ''}`,
    `Description: ${(row.description || '').substring(0, 800)}`,
    `Requirements: ${(row.requirements || '').substring(0, 400)}`,
  ].join('\n');

  const review = await reviewWithJev(initialText);

  const needsRequirements = !row.requirements || row.requirements.trim().length < 40;
  const needsDeadline = !row.deadline;
  const needsEmployerUrl = !row.employer_url || isAggregator(row.employer_url);
  const isShallow = (row.description?.length ?? 0) < 300 || (review && (review.qualityLevel === 'shallow' || review.qualityLevel === 'empty'));
  const isAgg = row.is_aggregator_source || isAggregator(row.source_url) || (review?.isAggregatorProb ?? 0) >= 0.6;

  if (!needsRequirements && !needsDeadline && !needsEmployerUrl && !isShallow && !isAgg) {
    return { status: 'already_adheres', fieldsUpdated: [], quality: review?.qualityLevel };
  }

  const targetUrl = (row.employer_url && isEmployer(row.employer_url) && !isAggregator(row.employer_url))
    ? row.employer_url
    : row.source_url;

  const html = await fetchHtml(targetUrl);
  let text = '';
  let appEmail = null;
  let atsLinks = [];

  if (html) {
    const extracted = extractTextFromHtml(html);
    text = extracted.text;
    appEmail = extracted.appEmail;
    atsLinks = extractAtsLinks(html, targetUrl);
  } else if (row.description && row.description.length > 50) {
    // Fallback extraction from stored description if external fetch fails/times out
    text = row.description;
  } else {
    return { status: 'fetch_failed', fieldsUpdated: [], reason: `Could not fetch ${targetUrl}` };
  }

  // Derive employer link from appEmail domain if no ATS links found
  if (atsLinks.length === 0 && appEmail) {
    const domain = appEmail.split('@')[1];
    const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'mail.com'];
    if (domain && !freeProviders.includes(domain)) {
      atsLinks.push(`https://www.${domain}`);
    }
  }

  const requirements = needsRequirements ? extractRequirementsFromText(text) : null;
  const deadline = needsDeadline ? extractDeadlineFromText(text) : null;
  const salary = extractSalaryFromText(text);

  const updates = {};
  const fieldsUpdated = [];

  // Company Name Correction (e.g. fix 'TRA' scraper bug or generic company name)
  if (row.company_name === 'TRA' || !row.company_name || row.company_name.trim() === '') {
    const candidateCompany = extractCompanyFromTitleOrText(row.title, row.description || text);
    if (candidateCompany && candidateCompany !== row.company_name) {
      updates.company_name = candidateCompany;
      fieldsUpdated.push('company_name');
    }
  }

  // Employer URL
  if (atsLinks.length > 0 && needsEmployerUrl) {
    updates.employer_url = atsLinks[0];
    updates.is_aggregator_source = false;
    fieldsUpdated.push('employer_url', 'is_aggregator_source');
  } else if (needsEmployerUrl && (isAts(row.source_url) || isEmployer(row.source_url))) {
    updates.employer_url = row.source_url;
    updates.is_aggregator_source = false;
    fieldsUpdated.push('employer_url', 'is_aggregator_source');
  }

  // Requirements
  if (needsRequirements && requirements) {
    updates.requirements = requirements;
    fieldsUpdated.push('requirements');
  }

  // Deadline & expiration check
  if (deadline) {
    if (needsDeadline) {
      updates.deadline = deadline;
      fieldsUpdated.push('deadline');
    }
    if (deadline < new Date()) {
      updates.is_active = false;
      fieldsUpdated.push('is_active(expired)');
    }
  } else if (row.deadline && new Date(row.deadline) < new Date()) {
    updates.is_active = false;
    fieldsUpdated.push('is_active(expired)');
  }

  // Salary
  if (salary.salaryMin && !row.salary_min) {
    updates.salary_min = String(salary.salaryMin);
    updates.salary_max = salary.salaryMax ? String(salary.salaryMax) : null;
    updates.salary_currency = salary.salaryCurrency;
    fieldsUpdated.push('salary');
  }

  // Replace [email protected] in description
  if (appEmail && row.description && row.description.includes('[email protected]')) {
    updates.description = row.description.replace(/\[email\s*protected\]/gi, appEmail);
    fieldsUpdated.push('description(decoded_email)');
  } else if (isShallow && text.length > (row.description?.length ?? 0) + 100) {
    updates.description = text.substring(0, 3000);
    fieldsUpdated.push('description');
  }

  // Deactivate illegitimate
  if (review && review.isLegitimateProb < 0.2) {
    updates.is_active = false;
    fieldsUpdated.push('is_active(deactivated)');
  }

  if (fieldsUpdated.length > 0) {
    updates.updated_at = new Date();
    if (!dryRun) {
      // postgres.js supports sql(object) for safe SET clause generation
      await sql`UPDATE jobs SET ${sql(updates)} WHERE id = ${row.id}`;
    }
  }

  const status = fieldsUpdated.includes('employer_url') ? 'aggregator_resolved' : fieldsUpdated.length > 0 ? 'enriched' : 'already_adheres';
  return { status, fieldsUpdated, quality: review?.qualityLevel, resolvedUrl: updates.employer_url };
}

// ─── Query helpers ────────────────────────────────────────────────────────────
async function fetchJobBatch(limit, offset, aggregatorsOnly, corruptedOnly) {
  if (corruptedOnly) {
    return await sql`
      SELECT id, title, company_name, description, requirements, deadline,
             source_url, employer_url, is_aggregator_source, salary_min
      FROM jobs
      WHERE is_active = true AND (company_name = 'TRA' OR company_name IS NULL)
      ORDER BY updated_at ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }
  if (aggregatorsOnly) {
    return await sql`
      SELECT id, title, company_name, description, requirements, deadline,
             source_url, employer_url, is_aggregator_source, salary_min
      FROM jobs
      WHERE is_active = true AND is_aggregator_source = true
      ORDER BY updated_at ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }
  return await sql`
    SELECT id, title, company_name, description, requirements, deadline,
           source_url, employer_url, is_aggregator_source, salary_min
    FROM jobs
    WHERE is_active = true AND (
      requirements IS NULL OR
      deadline IS NULL OR
      employer_url IS NULL OR
      is_aggregator_source = true OR
      company_name = 'TRA'
    )
    ORDER BY updated_at ASC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

async function fetchTenderBatch(limit, offset) {
  return await sql`
    SELECT id, title, contracting_authority, description, deadline,
           source_url, employer_url, document_url
    FROM tenders
    WHERE (
      length(coalesce(description, '')) < 200 OR
      employer_url IS NULL
    )
    ORDER BY updated_at ASC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

async function fetchComplianceBatch(limit, offset) {
  return await sql`
    SELECT id, title, issuing_authority, description,
           source_url, employer_url
    FROM compliance_requirements
    WHERE (
      length(coalesce(description, '')) < 200 OR
      employer_url IS NULL
    )
    ORDER BY updated_at ASC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

// ─── Update helpers for tenders and compliance ────────────────────────────────
async function processTenderRow(row, { dryRun }) {
  const text = await fetchHtml(row.document_url || row.source_url);
  if (!text) return { status: 'fetch_failed', fieldsUpdated: [] };

  const cleanText = extractTextFromHtml(text);
  const atsLinks = extractAtsLinks(text, row.source_url);
  const deadline = !row.deadline ? extractDeadlineFromText(cleanText) : null;

  const updates = {};
  const fieldsUpdated = [];

  if (atsLinks.length > 0 && !row.employer_url) {
    updates.employer_url = atsLinks[0];
    fieldsUpdated.push('employer_url');
  }
  if (deadline) {
    updates.deadline = deadline;
    fieldsUpdated.push('deadline');
  }
  if ((row.description?.length ?? 0) < 200 && cleanText.length > 200) {
    updates.description = cleanText.substring(0, 3000);
    fieldsUpdated.push('description');
  }

  if (fieldsUpdated.length > 0 && !dryRun) {
    updates.updated_at = new Date();
    await sql`UPDATE tenders SET ${sql(updates)} WHERE id = ${row.id}`;
  }
  return { status: fieldsUpdated.length > 0 ? 'enriched' : 'already_adheres', fieldsUpdated };
}

async function processComplianceRow(row, { dryRun }) {
  const html = await fetchHtml(row.source_url);
  if (!html) return { status: 'fetch_failed', fieldsUpdated: [] };

  const cleanText = extractTextFromHtml(html);
  const atsLinks = extractAtsLinks(html, row.source_url);

  const updates = {};
  const fieldsUpdated = [];

  if (atsLinks.length > 0 && !row.employer_url) {
    updates.employer_url = atsLinks[0];
    fieldsUpdated.push('employer_url');
  }
  if ((row.description?.length ?? 0) < 200 && cleanText.length > 200) {
    updates.description = cleanText.substring(0, 3000);
    fieldsUpdated.push('description');
  }

  if (fieldsUpdated.length > 0 && !dryRun) {
    updates.updated_at = new Date();
    await sql`UPDATE compliance_requirements SET ${sql(updates)} WHERE id = ${row.id}`;
  }
  return { status: fieldsUpdated.length > 0 ? 'enriched' : 'already_adheres', fieldsUpdated };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const stats = { alreadyAdheres: 0, enriched: 0, aggregatorResolved: 0, failed: 0, deactivated: 0, total: 0 };
  let processed = 0;
  let currentOffset = OFFSET;

  while (processed < MAX) {
    const batchSize = Math.min(BATCH, MAX - processed);
    let batch = [];

    if (MODULE === 'jobs' || MODULE === 'all') {
      batch = await fetchJobBatch(batchSize, currentOffset, AGGREGATORS_ONLY, CORRUPTED_ONLY);
    } else if (MODULE === 'tenders') {
      batch = await fetchTenderBatch(batchSize, currentOffset);
    } else if (MODULE === 'compliance') {
      batch = await fetchComplianceBatch(batchSize, currentOffset);
    }

    if (batch.length === 0) {
      console.log(`\n[CLI] ✅ No more records to process.`);
      break;
    }

    for (const [i, row] of batch.entries()) {
      stats.total++;
      const rowNum = processed + i + 1;
      const idShort = row.id?.substring(0, 8);
      const titleShort = (row.title || 'Untitled').substring(0, 45);
      process.stdout.write(`\r[${rowNum}/${MAX}] ${idShort} "${titleShort}" ...`);

      let result;
      try {
        if (MODULE === 'tenders') {
          result = await processTenderRow(row, { dryRun: DRY_RUN });
        } else if (MODULE === 'compliance') {
          result = await processComplianceRow(row, { dryRun: DRY_RUN });
        } else {
          result = await processJobRow(row, { dryRun: DRY_RUN });
        }
      } catch (err) {
        result = { status: 'failed', fieldsUpdated: [], reason: err?.message };
      }

      const icon =
        result.status === 'already_adheres' ? '✓' :
        result.status === 'aggregator_resolved' ? '🔗' :
        result.status === 'enriched' ? '✨' :
        result.status === 'fetch_failed' ? '⚠️' :
        result.status === 'failed' ? '❌' : '?';

      const detail =
        result.fieldsUpdated?.length > 0
          ? ` → [${result.fieldsUpdated.join(', ')}]`
          : result.reason ? ` → ${result.reason}` : '';

      const qualityTag = result.quality ? ` (${result.quality})` : '';

      console.log(`\r[${rowNum}/${MAX}] ${icon} ${idShort} "${titleShort}"${qualityTag}${detail}`);

      if (result.status === 'already_adheres') stats.alreadyAdheres++;
      else if (result.status === 'enriched') stats.enriched++;
      else if (result.status === 'aggregator_resolved') stats.aggregatorResolved++;
      else if (result.status === 'fetch_failed' || result.status === 'failed') stats.failed++;
      if (result.fieldsUpdated?.includes('is_active(deactivated)')) stats.deactivated++;

      // Pause between requests
      await new Promise(r => setTimeout(r, 350));
    }

    processed += batch.length;
    currentOffset += batch.length;

    if (batch.length < batchSize) break; // No more records
  }

  console.log('\n[CLI] ─────────────────────────────────────────────────────────');
  console.log(`[CLI] Summary ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);
  console.log(`[CLI]   Total processed     : ${stats.total}`);
  console.log(`[CLI]   Already compliant   : ${stats.alreadyAdheres}`);
  console.log(`[CLI]   Enriched            : ${stats.enriched}`);
  console.log(`[CLI]   Aggregator resolved : ${stats.aggregatorResolved}`);
  console.log(`[CLI]   Failed/skipped      : ${stats.failed}`);
  console.log(`[CLI]   Deactivated         : ${stats.deactivated}`);
  console.log('[CLI] ─────────────────────────────────────────────────────────\n');

  await sql.end();
}

main().catch(err => {
  console.error('[CLI] Fatal error:', err);
  sql.end().finally(() => process.exit(1));
});
