/**
 * scraper-v2.ts — Resilient Mass Scraping Engine
 *
 * Design principles:
 *  1. Every URL is an independent unit — one URL failing can NEVER block others
 *  2. Per-URL hard timeout covers the full fetch + AI pipeline
 *  3. Progress is saved to disk after every URL — resume from any crash
 *  4. Known-bad domains are pre-filtered before any network call is made
 *  5. AI calls are sequential (not concurrent) — prevents key pool exhaustion
 *  6. DB writes are retried 3× with exponential backoff — never silently lost
 *  7. Graceful SIGINT/SIGTERM — saves progress before exiting
 *  8. Live progress summary logged every 10 URLs
 */

import { config } from '@dotenvx/dotenvx';
config({ path: '.env.local', quiet: true });

import * as fs from 'fs';
import * as path from 'path';
import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { tenders } from '../src/lib/db/schema/tenders';
import { complianceRequirements } from '../src/lib/db/schema/compliance';
import { salarySubmissions } from '../src/lib/db/schema/salaries';
import { countries } from '../src/lib/db/schema/shared';
import { extractJobsWithAI, searchGoogle } from '../src/lib/scrapers/broad-search-engine';
import { extractTendersWithAI } from '../src/lib/scrapers/broad-search-engine-tenders';
import { extractResourcesWithAI, htmlToText, fetchHtml } from '../src/lib/scrapers/compliance-base';
import { extractSalariesWithAI } from '../src/lib/scrapers/broad-search-engine-salaries';
import { fetchAllHealthIndicators } from '../src/lib/scrapers/health-world-bank';

// ------------------------------------------------------------------
// CONFIG
// ------------------------------------------------------------------

const TARGET_PAGES_PER_CATEGORY = 60;   // URLs to scrape per (country × category)
const URL_TIMEOUT_MS            = 60_000; // Hard cap per URL: fetch + AI must finish in 60s
const DB_RETRY_ATTEMPTS         = 3;
const PROGRESS_FILE             = path.join(process.cwd(), 'scraper-progress.json');

// Domains that reliably fail — pre-filter before any network call
const BLOCKED_DOMAINS = new Set([
  'reliefweb.int',
  'linkedin.com',
  'glassdoor.com',
  'indeed.com',
  'fuzu.com',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'youtube.com',
  'tiktok.com',
]);

// ------------------------------------------------------------------
// PROGRESS FILE — Resumable scraping
// ------------------------------------------------------------------

interface Progress {
  attempted: string[];   // URLs that have been fully processed (success or fail)
  lastUpdated: string;
}

function loadProgress(): Progress {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = fs.readFileSync(PROGRESS_FILE, 'utf-8');
      const p = JSON.parse(raw) as Progress;
      console.log(`[Progress] Loaded ${p.attempted.length} already-processed URLs from progress file.`);
      return p;
    }
  } catch {
    console.warn('[Progress] Could not read progress file, starting fresh.');
  }
  return { attempted: [], lastUpdated: new Date().toISOString() };
}

function saveProgress(progress: Progress) {
  try {
    progress.lastUpdated = new Date().toISOString();
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Progress] Failed to save progress file:', (err as Error).message);
  }
}

// ------------------------------------------------------------------
// UTILS
// ------------------------------------------------------------------

/** Wraps any promise with a hard timeout. Rejects with a timeout error if exceeded. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Hard timeout exceeded (${ms}ms)`)), ms);
    promise.then(
      val => { clearTimeout(timer); resolve(val); },
      err => { clearTimeout(timer); reject(err); },
    );
  });
}

/** Retry a DB insert up to N times with exponential backoff. */
async function dbInsertWithRetry(fn: () => Promise<void>): Promise<boolean> {
  for (let i = 1; i <= DB_RETRY_ATTEMPTS; i++) {
    try {
      await fn();
      return true;
    } catch (err) {
      const e = err as Error;
      if (i < DB_RETRY_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 1000 * i));
      } else {
        console.warn(`[DB] Insert failed after ${DB_RETRY_ATTEMPTS} attempts: ${e.message?.slice(0, 80)}`);
      }
    }
  }
  return false;
}

function isBlocked(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    for (const domain of BLOCKED_DOMAINS) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) return true;
    }
  } catch {
    return true; // Malformed URL
  }
  return false;
}

// ------------------------------------------------------------------
// PER-URL PROCESSORS — Each is fully isolated with its own try/catch + timeout
// ------------------------------------------------------------------

async function processJobUrl(
  url: string,
  countryId: string,
  countryName: string,
): Promise<{ saved: number; skipped: boolean }> {
  if (isBlocked(url)) return { saved: 0, skipped: true };

  try {
    const result = await withTimeout(
      (async () => {
        const html = await fetchHtml(url);
        if (!html) return 0;
        const text = htmlToText(html, url);
        const extracted = await extractJobsWithAI(text, url);
        let saved = 0;
        for (const job of extracted) {
          const ok = await dbInsertWithRetry(() =>
            db.insert(jobs).values({
              title: job.title,
              companyName: job.companyName || 'Unknown',
              description: job.description,
              requirements: job.requirements,
              location: job.location,
              countryId,
              jobType: job.jobType,
              sourceUrl: job.sourceUrl || url,
              deadline: job.deadline,
            }).onConflictDoNothing({ target: jobs.sourceUrl }).execute()
          );
          if (ok) saved++;
        }
        return saved;
      })(),
      URL_TIMEOUT_MS,
    );
    return { saved: result, skipped: false };
  } catch (err) {
    console.warn(`  [Jobs][${countryName}] URL failed: ${url.slice(0, 70)} — ${(err as Error).message?.slice(0, 60)}`);
    return { saved: 0, skipped: false };
  }
}

async function processTenderUrl(
  url: string,
  countryId: string,
  countryName: string,
): Promise<{ saved: number; skipped: boolean }> {
  if (isBlocked(url)) return { saved: 0, skipped: true };

  try {
    const result = await withTimeout(
      (async () => {
        const html = await fetchHtml(url);
        if (!html) return 0;
        const text = htmlToText(html, url);
        const extracted = await extractTendersWithAI(text, url);
        let saved = 0;
        for (const tender of extracted) {
          const ok = await dbInsertWithRetry(() =>
            db.insert(tenders).values({
              referenceNo: tender.referenceNo,
              title: tender.title,
              description: tender.description,
              contractingAuthority: tender.contractingAuthority,
              countryId,
              category: tender.category,
              budget: tender.budget?.toString() ?? null,
              currency: tender.currency || 'USD',
              sourceUrl: tender.sourceUrl || url,
              deadline: tender.deadline || new Date(Date.now() + 30 * 86400 * 1000),
            }).onConflictDoNothing({ target: tenders.sourceUrl }).execute()
          );
          if (ok) saved++;
        }
        return saved;
      })(),
      URL_TIMEOUT_MS,
    );
    return { saved: result, skipped: false };
  } catch (err) {
    console.warn(`  [Tenders][${countryName}] URL failed: ${url.slice(0, 70)} — ${(err as Error).message?.slice(0, 60)}`);
    return { saved: 0, skipped: false };
  }
}

async function processComplianceUrl(
  url: string,
  countryId: string,
  countryName: string,
): Promise<{ saved: number; skipped: boolean }> {
  if (isBlocked(url)) return { saved: 0, skipped: true };

  try {
    const result = await withTimeout(
      (async () => {
        const html = await fetchHtml(url);
        if (!html) return 0;
        const text = htmlToText(html, url);
        const extracted = await extractResourcesWithAI(
          text,
          `Government or Regulators of ${countryName}`,
          url,
          'Extract business compliance requirements, forms, and guidelines.',
        );
        let saved = 0;
        for (const res of extracted) {
          const ok = await dbInsertWithRetry(() =>
            db.insert(complianceRequirements).values({
              title: res.title,
              description: res.description,
              countryId,
              category: 'business_registration',
              issuingAuthority: `Government of ${countryName}`,
              resourceType: res.resourceType,
              sourceUrl: res.sourceUrl || url,
            }).onConflictDoNothing().execute()
          );
          if (ok) saved++;
        }
        return saved;
      })(),
      URL_TIMEOUT_MS,
    );
    return { saved: result, skipped: false };
  } catch (err) {
    console.warn(`  [Compliance][${countryName}] URL failed: ${url.slice(0, 70)} — ${(err as Error).message?.slice(0, 60)}`);
    return { saved: 0, skipped: false };
  }
}

async function processSalaryUrl(
  url: string,
  countryId: string,
  countryName: string,
): Promise<{ saved: number; skipped: boolean }> {
  if (isBlocked(url)) return { saved: 0, skipped: true };

  try {
    const result = await withTimeout(
      (async () => {
        const html = await fetchHtml(url);
        if (!html) return 0;
        const text = htmlToText(html, url);
        const extracted = await extractSalariesWithAI(text, countryName, url);
        let saved = 0;
        for (const sal of extracted) {
          const ok = await dbInsertWithRetry(() =>
            db.insert(salarySubmissions).values({
              jobTitle: sal.jobTitle,
              experienceLevel: sal.experienceLevel,
              employmentType: sal.employmentType,
              countryId,
              currency: sal.currency,
              grossMonthlySalary: sal.grossMonthlySalary.toString(),
              isVerified: false,
              isAnonymous: true,
            }).execute()
          );
          if (ok) saved++;
        }
        return saved;
      })(),
      URL_TIMEOUT_MS,
    );
    return { saved: result, skipped: false };
  } catch (err) {
    console.warn(`  [Salaries][${countryName}] URL failed: ${url.slice(0, 70)} — ${(err as Error).message?.slice(0, 60)}`);
    return { saved: 0, skipped: false };
  }
}

// ------------------------------------------------------------------
// BATCH RUNNER — Sequential AI calls, persistent progress
// ------------------------------------------------------------------

async function runBatch(
  label: string,
  urls: string[],
  progress: Progress,
  processor: (url: string) => Promise<{ saved: number; skipped: boolean }>,
): Promise<number> {
  const todo = urls.filter(u => !progress.attempted.includes(u));
  const preBlocked = todo.filter(u => isBlocked(u)).length;
  const workItems = todo.filter(u => !isBlocked(u));

  console.log(`\n  [${label}] ${urls.length} total → ${workItems.length} to process, ${urls.length - todo.length} already done, ${preBlocked} pre-blocked`);

  let totalSaved = 0;
  let totalFailed = 0;

  for (let i = 0; i < workItems.length; i++) {
    const url = workItems[i];
    const { saved, skipped } = await processor(url);

    // Mark as attempted regardless of outcome
    progress.attempted.push(url);

    if (saved > 0) {
      totalSaved += saved;
      process.stdout.write(`  ✓ +${saved}`);
    } else if (skipped) {
      process.stdout.write(`  ⏭`);
    } else {
      totalFailed++;
      process.stdout.write(`  ✗`);
    }

    // Progress summary every 10 URLs
    if ((i + 1) % 10 === 0 || i === workItems.length - 1) {
      console.log(`\n  [${label}] ${i + 1}/${workItems.length} done | ✓ ${totalSaved} saved | ✗ ${totalFailed} failed`);
      saveProgress(progress);
    }
  }

  // Mark blocked URLs as attempted too (no point retrying)
  const blockedUrls = todo.filter(u => isBlocked(u));
  for (const u of blockedUrls) {
    if (!progress.attempted.includes(u)) progress.attempted.push(u);
  }
  saveProgress(progress);

  return totalSaved;
}

// ------------------------------------------------------------------
// MAIN
// ------------------------------------------------------------------

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   🚀 AkiliBrain Scraper v2 — Resilient   ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const progress = loadProgress();

  // Graceful shutdown — always save progress
  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\n\n⚠️  Interrupted — saving progress...');
    saveProgress(progress);
    console.log('✅ Progress saved. Re-run to resume from where we stopped.');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Fetch countries with retry
  let allCountries: { id: string; name: string }[] = [];
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      allCountries = await db.select({ id: countries.id, name: countries.name }).from(countries);
      break;
    } catch (e: any) {
      console.warn(`[DB] Countries fetch attempt ${attempt} failed: ${e.message}`);
      if (attempt === 3) throw e;
      await new Promise(r => setTimeout(r, 5000 * attempt));
    }
  }

  console.log(`Found ${allCountries.length} countries to process.\n`);

  let grandTotalJobs = 0;
  let grandTotalTenders = 0;
  let grandTotalCompliance = 0;
  let grandTotalSalaries = 0;

  for (const country of allCountries) {
    if (shuttingDown) break;

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`🌍  ${country.name}`);
    console.log('═'.repeat(50));

    // ── JOBS ──────────────────────────────────────────
    const jobQueries = [
      `latest job vacancies ${country.name} 2026`,
      `hiring now jobs careers ${country.name}`,
      `NGO INGO jobs ${country.name}`,
      `IT software engineer jobs ${country.name}`,
      `finance accounting jobs ${country.name}`,
    ];
    let jobUrls: string[] = [];
    for (const q of jobQueries) {
      const urls = await searchGoogle(q, 20);
      jobUrls.push(...urls);
    }
    jobUrls = Array.from(new Set(jobUrls)).slice(0, TARGET_PAGES_PER_CATEGORY);

    const jobsSaved = await runBatch(
      `Jobs / ${country.name}`,
      jobUrls,
      progress,
      url => processJobUrl(url, country.id, country.name),
    );
    grandTotalJobs += jobsSaved;

    if (shuttingDown) break;

    // ── TENDERS ───────────────────────────────────────
    const tenderQueries = [
      `government tenders procurement bids ${country.name} 2026`,
      `open tenders contracts ${country.name} site:.go.ke OR site:.go.tz OR site:.go.ug`,
      `NGO INGO procurement request for proposals ${country.name}`,
    ];
    let tenderUrls: string[] = [];
    for (const q of tenderQueries) {
      const urls = await searchGoogle(q, 20);
      tenderUrls.push(...urls);
    }
    tenderUrls = Array.from(new Set(tenderUrls)).slice(0, TARGET_PAGES_PER_CATEGORY);

    const tendersSaved = await runBatch(
      `Tenders / ${country.name}`,
      tenderUrls,
      progress,
      url => processTenderUrl(url, country.id, country.name),
    );
    grandTotalTenders += tendersSaved;

    if (shuttingDown) break;

    // ── COMPLIANCE ────────────────────────────────────
    const complianceQueries = [
      `business registration ${country.name} official forms guidelines`,
      `tax compliance ${country.name} revenue authority`,
      `employment labor law regulations ${country.name}`,
    ];
    let compUrls: string[] = [];
    for (const q of complianceQueries) {
      const urls = await searchGoogle(q, 20);
      compUrls.push(...urls);
    }
    compUrls = Array.from(new Set(compUrls)).slice(0, TARGET_PAGES_PER_CATEGORY);

    const compSaved = await runBatch(
      `Compliance / ${country.name}`,
      compUrls,
      progress,
      url => processComplianceUrl(url, country.id, country.name),
    );
    grandTotalCompliance += compSaved;
    
    if (shuttingDown) break;

    // ── SALARIES ───────────────────────────────────────
    const salaryQueries = [
      `average salary for software engineer developer in ${country.name}`,
      `nurse doctor medical salary scale ${country.name}`,
      `teacher education salary guide ${country.name}`,
      `accountant finance salary ${country.name}`,
    ];
    let salaryUrls: string[] = [];
    for (const q of salaryQueries) {
      const urls = await searchGoogle(q, 20);
      salaryUrls.push(...urls);
    }
    salaryUrls = Array.from(new Set(salaryUrls)).slice(0, TARGET_PAGES_PER_CATEGORY);

    const salarySaved = await runBatch(
      `Salaries / ${country.name}`,
      salaryUrls,
      progress,
      url => processSalaryUrl(url, country.id, country.name),
    );
    grandTotalSalaries += salarySaved;

  }

  saveProgress(progress);

  console.log('\n\n╔══════════════════════════════════════════╗');
  console.log('║          ✅ Scrape Complete               ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Jobs saved:       ${String(grandTotalJobs).padStart(6)}                  ║`);
  console.log(`║  Tenders saved:    ${String(grandTotalTenders).padStart(6)}                  ║`);
  console.log(`║  Compliance saved: ${String(grandTotalCompliance).padStart(6)}                  ║`);
  console.log(`║  Salaries saved:   ${String(grandTotalSalaries).padStart(6)}                  ║`);
  console.log('╚══════════════════════════════════════════╝');

  console.log('\n🚀 Starting Health Data Sync via World Bank API...');
  try {
    const healthSaved = await fetchAllHealthIndicators();
    console.log(`✅ Health Data Sync Complete: ${healthSaved} records saved.`);
  } catch (err) {
    console.error('❌ Health Data Sync Failed:', err);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
