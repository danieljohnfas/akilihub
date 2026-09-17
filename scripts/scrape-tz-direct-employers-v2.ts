/**
 * scrape-tz-direct-employers-v2.ts
 *
 * Fixes for the original scraper:
 *  1. Uses Serper FIRST (proven working) with clean queries instead of relying on exhausted Exa/CSE
 *  2. Hardcodes known direct ATS URLs to skip search entirely for well-known employers
 *  3. Relies on Firecrawl (already configured) as JS-rendering fallback for SPA career portals
 *  4. Removes boolean OR operators from queries that broke Serper free tier
 */

process.on('uncaughtException', (err) => {
    console.error('🔥 Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
});

import { config } from 'dotenv';
config({ path: '.env.local' });

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { jobs } from '../src/lib/db/schema/jobs';
import { countries } from '../src/lib/db/schema/shared';
import { eq, sql } from 'drizzle-orm';

const client = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 5 });
const db = drizzle(client);

const COUNTRY_CODE = 'TZ';
const SERPER_KEY = process.env.SERPER_API_KEY;
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY;

// ── Known direct ATS / career portal URLs for major TZ employers ─────────────
// These are visited DIRECTLY without any search — no API quota consumed.
const KNOWN_CAREER_PAGES: { employer: string; url: string }[] = [
  { employer: 'CRDB Bank',                   url: 'https://careers.crdbbank.co.tz/' },
  { employer: 'NMB Bank',                    url: 'https://www.nmbbank.co.tz/careers' },
  { employer: 'Vodacom Tanzania',            url: 'https://jobs.vodafone.com/careers?domain=vodafone.com&location=Tanzania' },
  { employer: 'Airtel Tanzania',             url: 'https://www.airtel.co.tz/careers' },
  { employer: 'Tanzania Ports Authority',    url: 'https://www.tanzaniaports.go.tz/index.php/careers' },
  { employer: 'TANESCO',                     url: 'https://www.tanesco.co.tz/index.php/careers' },
  { employer: 'TRA',                         url: 'https://www.tra.go.tz/index.php/careers-at-tra' },
  { employer: 'UNICEF Tanzania',             url: 'https://www.unicef.org/tanzania/careers' },
  { employer: 'Aga Khan Health Services TZ', url: 'https://careers.aku.edu/jobs?country=Tanzania' },
  { employer: 'World Vision Tanzania',       url: 'https://www.wvi.org/tanzania/careers' },
  { employer: 'Standard Chartered TZ',       url: 'https://www.sc.com/tz/careers/' },
  { employer: 'Tanzania Breweries Limited',  url: 'https://www.tanzaniabreweries.com/careers/' },
  { employer: 'Bank of Tanzania',            url: 'https://www.bot.go.tz/Careers' },
  { employer: 'BRELA',                       url: 'https://www.brela.go.tz/index.php/vacancies' },
  { employer: 'NSSF Tanzania',               url: 'https://www.nssf.or.tz/index.php?option=com_content&view=article&id=22' },
  { employer: 'Plan International TZ',       url: 'https://plan-international.org/jobs/?search_api_views_fulltext=&field_country%5B%5D=Tanzania' },
  { employer: 'Mwananchi Communications',    url: 'https://www.mwananchi.co.tz/mw/habari/nafasi-za-kazi' },
  { employer: 'AMREF Health Africa TZ',      url: 'https://amref.org/jobs/?country=Tanzania' },
  { employer: 'Save the Children TZ',        url: 'https://www.savethechildren.net/careers?location=Tanzania' },
  { employer: 'ActionAid Tanzania',          url: 'https://www.actionaid.org/jobs?country=Tanzania' },
];

// ── Employers to find via Serper search ──────────────────────────────────────
// Used for employers whose ATS URL isn't hardcoded or may change.
const SEARCH_EMPLOYERS = [
  'KCB Bank Tanzania jobs site:kcbgroup.com',
  'Absa Bank Tanzania careers site:absa.co.tz',
  'Deloitte Tanzania vacancies site:deloitte.com',
  'PwC Tanzania careers site:pwc.com',
  'CARE International Tanzania jobs',
  'FHI 360 Tanzania vacancies',
  'Pathfinder International Tanzania jobs',
  'Kilombero Sugar Tanzania careers',
  'Twiga Cement Tanzania jobs',
  'Muhimbili National Hospital Tanzania vacancies',
  'University of Dar es Salaam UDSM jobs',
  'Ardhi University Tanzania vacancies',
  'IRC International Rescue Committee Tanzania jobs',
  'MSF Doctors Without Borders Tanzania',
  'Selcom Tanzania careers',
];

// ── Serper search → returns top URLs ─────────────────────────────────────────
async function serperSearch(query: string): Promise<string[]> {
  if (!SERPER_KEY) return [];
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 3 }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn(`[Serper] ${res.status}: ${err.slice(0, 120)}`);
      return [];
    }
    const data = await res.json();
    return (data.organic || []).map((r: any) => r.link).filter(Boolean);
  } catch (e) {
    console.warn(`[Serper] Error:`, (e as Error).message);
    return [];
  }
}

// ── Fetch page HTML — uses sidecar for JS-heavy SPAs ────────────────────────
const SIDECAR_URL = process.env.SCRAPLING_URL ?? 'https://akilihub-scraper.onrender.com';

async function fetchCareerPage(url: string): Promise<string | null> {
  // 1. Plain fetch first (fast, free)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,*/*',
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (res.ok) {
      const html = await res.text();
      if (html.length > 500) {
        console.log(`[fetch] Plain fetch OK for ${url} (${html.length} chars)`);
        return html;
      }
    }
  } catch {}

  // 2. Python sidecar /fetch_html (Scrapling stealth — real browser fingerprinting, no credits needed)
  try {
    console.log(`[Sidecar] Attempting stealth fetch for ${url}...`);
    const res = await fetch(`${SIDECAR_URL}/fetch_html`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, use_stealth: true }),
      signal: AbortSignal.timeout(60_000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.html && data.html.length > 500) {
        console.log(`[Sidecar] Got ${data.html.length} chars for ${url}`);
        return data.html;
      }
    }
  } catch (e) {
    console.warn(`[Sidecar] fetch_html error: ${(e as Error).message}`);
  }

  // 3. Firecrawl — handles JS-rendered SPAs (fallback if sidecar unavailable)
  if (FIRECRAWL_KEY) {
    try {
      console.log(`[Firecrawl] Attempting JS render for ${url}...`);
      const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: { Authorization: `Bearer ${FIRECRAWL_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, formats: ['html', 'markdown'], waitFor: 4000, onlyMainContent: false }),
        signal: AbortSignal.timeout(45_000),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.data?.html || data.data?.markdown || '';
        if (content.length > 500) {
          console.log(`[Firecrawl] Got ${content.length} chars for ${url}`);
          return content;
        }
      } else {
        const err = await res.text();
        console.warn(`[Firecrawl] ${res.status}: ${err.slice(0, 120)}`);
      }
    } catch (e) {
      console.warn(`[Firecrawl] Error: ${(e as Error).message}`);
    }
  }

  // 4. Python sidecar /smart_scrape — LLM-powered extraction as final fallback
  try {
    console.log(`[Sidecar] Attempting smart_scrape for ${url}...`);
    const res = await fetch(`${SIDECAR_URL}/smart_scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, prompt: 'Extract all job postings, vacancies, and career opportunities listed on this page.' }),
      signal: AbortSignal.timeout(90_000),
    });
    if (res.ok) {
      const data = await res.json();
      const content = data.result || data.text || data.html || '';
      if (content.length > 300) {
        console.log(`[Sidecar/smart_scrape] Got ${content.length} chars for ${url}`);
        return content;
      }
    }
  } catch (e) {
    console.warn(`[Sidecar] smart_scrape error: ${(e as Error).message}`);
  }

  // 5. Jina Reader proxy (free, bypasses some bot protection)
  try {
    console.log(`[Jina] Trying ${url}...`);
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: 'text/plain', 'X-No-Cache': 'true' },
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok) {
      const text = await res.text();
      if (text.length > 300) {
        console.log(`[Jina] Got ${text.length} chars for ${url}`);
        return text;
      }
    }
  } catch {}

  console.warn(`[fetchCareerPage] All methods failed for ${url}`);
  return null;
}

// ── AI extraction using Serper snippet data ───────────────────────────────────
// If the page itself can't be fetched, use Serper's snippet as a last resort
async function getJobsFromSerperSnippets(query: string, employer: string): Promise<any[]> {
  if (!SERPER_KEY) return [];
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${query} job title deadline`, num: 10 }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = await res.json();

    // Serper sitelinks / answerBox sometimes contains job listings with deadlines
    const jobs = [];
    for (const result of (data.organic || [])) {
      if (result.title && result.snippet && result.link) {
        const snippet: string = result.snippet;
        // Look for deadline indicators in the snippet
        const hasDeadline = /deadline|closing|apply by|due date|\d{4}-\d{2}-\d{2}/i.test(snippet);
        const hasJobIndicator = /vacancies|position|officer|manager|engineer|analyst|specialist|nurse|doctor/i.test(snippet);
        if (hasDeadline && hasJobIndicator) {
          jobs.push({
            title: result.title.replace(/\s*[\|–\-]\s*.*/g, '').trim(),
            url: result.link,
            snippet,
            employer,
          });
        }
      }
    }
    return jobs;
  } catch { return []; }
}

// ── Parse and save jobs extracted from a career page ─────────────────────────
async function processCareerPage(employer: string, url: string, countryId: string): Promise<number> {
  console.log(`\n🔍 Scraping ${employer}: ${url}`);

  const html = await fetchCareerPage(url);
  if (!html) {
    console.warn(`  ⚠️  Could not fetch page`);
    return 0;
  }

  // Dynamic import ensures env is loaded before these modules initialise
  const { extractJobsWithAI } = await import('../src/lib/scrapers/broad-search-engine');
  const { htmlToTextEnriched } = await import('../src/lib/scrapers/compliance-base');

  let text: string;
  try {
    const enriched = await htmlToTextEnriched(html, url);
    text = enriched.text;
  } catch {
    text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 30000);
  }

  const discovered = await extractJobsWithAI(text, url, html);

  if (discovered.length === 0) {
    console.log(`  ℹ️  No jobs extracted (page may be JS-rendered shell or no active openings)`);
    return 0;
  }

  console.log(`  ✅ Extracted ${discovered.length} jobs`);

  // Insert directly — bypassing saveJobs to avoid re-import of DB client with wrong env
  let inserted = 0;
  for (const job of discovered) {
    try {
      const result = await db.insert(jobs).values({
        id: crypto.randomUUID(),
        title: job.title,
        companyName: job.companyName || employer,
        description: job.description || '',
        requirements: job.requirements || null,
        location: job.regionId ? null : 'Tanzania',
        countryId,
        regionId: job.regionId || null,
        jobType: (job.jobType || 'full_time') as any,
        sourceUrl: job.sourceUrl,
        employerUrl: url,
        postedDate: job.postedDate || new Date(),
        deadline: job.deadline || null,
        salaryMin: job.salaryMin ? String(job.salaryMin) : null,
        salaryMax: job.salaryMax ? String(job.salaryMax) : null,
        salaryCurrency: job.salaryCurrency || 'TZS',
        isAggregatorSource: false,
        isActive: true,
        needsAiExtraction: true,
      }).onConflictDoNothing({ target: jobs.sourceUrl }).returning({ id: jobs.id });
      inserted += result.length;
    } catch (e) {
      console.warn(`  ⚠️  Insert failed for "${job.title}": ${(e as Error).message?.slice(0, 80)}`);
    }
  }

  if (inserted > 0) console.log(`  💾 Inserted ${inserted} new jobs`);
  return inserted;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  const [{ id: countryId }] = await db
    .select({ id: countries.id })
    .from(countries)
    .where(eq(countries.code, COUNTRY_CODE))
    .limit(1);

  const [before] = await db.select({ count: sql`count(*)`.mapWith(Number) })
    .from(jobs)
    .innerJoin(countries, eq(jobs.countryId, countries.id))
    .where(eq(countries.code, COUNTRY_CODE));

  console.log(`\n🚀 TZ Direct Employer Scraper v2`);
  console.log(`📊 Starting job count: ${before.count}`);
  console.log(`🔑 Serper: ${SERPER_KEY ? 'YES' : 'NO'} | Firecrawl: ${FIRECRAWL_KEY ? 'YES' : 'NO'}\n`);

  let totalInserted = 0;

  // ── PHASE 1: Visit known direct ATS URLs ─────────────────────────────────
  console.log(`\n═══ PHASE 1: Known Career Pages (${KNOWN_CAREER_PAGES.length} employers) ═══`);
  for (const { employer, url } of KNOWN_CAREER_PAGES) {
    const n = await processCareerPage(employer, url, countryId);
    totalInserted += n;
    await new Promise(r => setTimeout(r, 1500)); // polite delay
  }

  // ── PHASE 2: Serper search for other employers ────────────────────────────
  console.log(`\n═══ PHASE 2: Serper Search (${SEARCH_EMPLOYERS.length} queries) ═══`);
  for (const query of SEARCH_EMPLOYERS) {
    const urls = await serperSearch(query);
    if (urls.length === 0) {
      console.log(`  No results for: ${query}`);
      continue;
    }
    // Take just the top result — most likely the official page
    const topUrl = urls[0];
    const employer = query.split(' ')[0] + ' ' + (query.split(' ')[1] || '');
    const n = await processCareerPage(employer, topUrl, countryId);
    totalInserted += n;
    await new Promise(r => setTimeout(r, 2000));
  }

  const [after] = await db.select({ count: sql`count(*)`.mapWith(Number) })
    .from(jobs)
    .innerJoin(countries, eq(jobs.countryId, countries.id))
    .where(eq(countries.code, COUNTRY_CODE));

  console.log(`\n✅ Scraping complete!`);
  console.log(`   Jobs before: ${before.count}`);
  console.log(`   Jobs after:  ${after.count}`);
  console.log(`   New jobs inserted: ${totalInserted}`);
}

run().catch(console.error).finally(() => process.exit(0));
