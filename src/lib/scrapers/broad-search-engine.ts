import { generateObjectWithFallback } from '../ai/router';
import { normalizeLocationAndGetRegionId } from '../ai/location';
import { z } from 'zod';
import { fetchHtml, htmlToTextEnriched } from './compliance-base';
import { getAllAggregatorDomains } from '../sources/aggregators';
import { extractDeterministicJobFields } from './deterministic-extractor';
import * as cheerio from 'cheerio';

export interface BroadJobResource {
  title: string;
  companyName: string;
  description: string;
  requirements: string | null;
  regionId: string | null;
  jobType: 'full_time' | 'part_time' | 'contract' | 'internship' | 'remote';
  sourceUrl: string;
  postedDate: Date | null;
  deadline: Date | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null; // ISO 4217, e.g. "KES", "TZS"
  countryCode: string | null; // ISO 3166-1 alpha-2, e.g. "TZ", "KE", "MG"
  needsAiExtraction?: boolean;
}

// ── Blocked domains: all known aggregator domains (sourced from registry) ──────
// ATS platforms are NOT included here — they can appear in search results as
// they are the employer's own hiring system.
const BLOCKED_DOMAINS = getAllAggregatorDomains();

// ── DuckDuckGo HTML Search (free, robust, direct fetch) ────────────────────────
async function searchDDGHtml(query: string, numResults: number): Promise<string[]> {
  try {
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: `q=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.warn(`[searchDDGHtml] returned ${res.status}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const urls: string[] = [];

    $("a.result__url").each((i, el) => {
      let href = $(el).attr("href");
      if (!href) return;
      if (href.startsWith("//duckduckgo.com/l/?uddg=")) {
         href = decodeURIComponent(href.replace("//duckduckgo.com/l/?uddg=", "").split("&")[0]);
      }
      if (href && !BLOCKED_DOMAINS.some(d => href!.includes(d))) {
        urls.push(href);
      }
    });

    const finalUrls = urls.slice(0, numResults);
    if (finalUrls.length > 0) {
      console.log(`[searchDDGHtml] DuckDuckGo returned ${finalUrls.length} URLs for: "${query}"`);
    }
    return finalUrls;
  } catch (err) {
    console.error(`[searchDDGHtml] Error:`, err);
    return [];
  }
}

// ── Serper.dev fallback (paid, used only when SERPER_API_KEY is set) ────────
async function searchSerper(query: string, numResults: number): Promise<string[]> {
  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey) return [];

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: Math.min(Math.max(numResults, 10), 100) }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[searchSerper] API failed: ${res.status} ${res.statusText} — ${errText}`);
      return [];
    }

    const data = await res.json();
    if (!data.organic || !Array.isArray(data.organic)) return [];

    return data.organic
      .map((item: { link?: string }) => item.link)
      .filter((link: string | undefined) => !!link && !BLOCKED_DOMAINS.some(d => link.includes(d)));
  } catch (error) {
    console.error('[searchSerper] Error:', error);
    return [];
  }
}

// ── SearXNG Dynamic Fallback ──────────────────────────────────────────────
let cachedSearxngInstances: string[] | null = null;
let lastSearxngFetch = 0;

async function getSearxngInstances() {
  if (cachedSearxngInstances && Date.now() - lastSearxngFetch < 1000 * 60 * 60) {
    return cachedSearxngInstances;
  }
  try {
    const res = await fetch("https://searx.space/data/instances.json", { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    const instances = Object.keys(data.instances).filter(k => {
      const inst = data.instances[k];
      return inst.network_type === "normal" && inst.error === null && (inst.timing?.search?.all?.median ?? 10) < 2.0;
    });
    // Shuffle the instances
    cachedSearxngInstances = instances.sort(() => Math.random() - 0.5);
    lastSearxngFetch = Date.now();
    return cachedSearxngInstances;
  } catch (err) {
    console.warn(`[SearXNG] Failed to fetch dynamic instances:`, err);
    return ['https://paulgo.io/', 'https://baresearch.org/', 'https://opnxng.com/'];
  }
}

async function searchSearXNG(query: string, numResults: number): Promise<string[]> {
  const instances = await getSearxngInstances();
  for (const instance of instances.slice(0, 5)) { // Try up to 5 instances (was 15 — too slow)
    try {
      const url = new URL(`search`, instance);
      url.searchParams.set('q', query);
      url.searchParams.set('categories', 'general');
      url.searchParams.set('language', 'en');
      url.searchParams.set('time_range', 'month');

      const res = await fetch(url.toString(), {
        headers: { 'Accept': 'text/html,application/xhtml+xml', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) continue;
      
      const html = await res.text();
      const $ = cheerio.load(html);
      const urls: string[] = [];

      $(".result_header a").each((i, el) => {
        const href = $(el).attr("href");
        if (href && !BLOCKED_DOMAINS.some(d => href.includes(d))) {
          urls.push(href);
        }
      });

      const finalUrls = urls.slice(0, numResults);

      if (finalUrls.length > 0) {
        console.log(`[searchSearXNG] ${instance} -> ${finalUrls.length} URLs for: "${query}"`);
        return finalUrls;
      }
    } catch (err) {
      // ignore and try next
    }
  }
  return [];
}

// ── Exa API (Primary, robust AI search) ────────────────────────────────────────
async function searchExa(query: string, numResults: number): Promise<string[]> {
  const apiKey = process.env.EXA_API_KEY?.trim();
  if (!apiKey) return [];

  try {
    const res = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, type: 'auto', numResults: Math.min(Math.max(numResults, 10), 50) }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[searchExa] API failed: ${res.status} ${res.statusText} — ${errText}`);
      return [];
    }

    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    const finalUrls = data.results
      .map((item: { url?: string }) => item.url)
      .filter((link: string | undefined) => !!link && !BLOCKED_DOMAINS.some(d => link.includes(d)));

    if (finalUrls.length > 0) {
      console.log(`[searchExa] Exa returned ${finalUrls.length} URLs for: "${query}"`);
    }
    return finalUrls;
  } catch (error) {
    console.error('[searchExa] Error:', error);
    return [];
  }
}

/**
 * Searches for relevant URLs.
 *
 * Priority order:
 *   1. Exa API          — fast, ultra-reliable search specifically for AI
 *   2. DuckDuckGo HTML  — direct scraping via Cheerio, free, reliable when not IP-blocked
 *   3. SearXNG Dynamic  — loops through 5 free public instances
 *   4. Serper.dev       — paid fallback
 */

// ── Google Custom Search Engine (CSE) ────────────────────────────────────────
// Official Google results, 100 queries/day free. Use as first fallback after Exa.
async function searchGoogleCSE(query: string, numResults: number): Promise<string[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY?.trim();
  const cx = process.env.GOOGLE_CSE_ID?.trim();
  if (!apiKey || !cx) return [];

  try {
    // Google CSE allows max 10 per request; we cap at 10 for the free tier
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', cx);
    url.searchParams.set('q', query);
    url.searchParams.set('num', String(Math.min(numResults, 10)));

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(12_000) });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[searchGoogleCSE] API failed: ${res.status} — ${errText.slice(0, 120)}`);
      return [];
    }

    const data = await res.json();
    if (!data.items || !Array.isArray(data.items)) return [];

    const finalUrls = data.items
      .map((item: { link?: string }) => item.link)
      .filter((link: string | undefined) => !!link && !BLOCKED_DOMAINS.some(d => link!.includes(d)));

    if (finalUrls.length > 0) {
      console.log(`[searchGoogleCSE] Google CSE returned ${finalUrls.length} URLs for: "${query}"`);
    }
    return finalUrls;
  } catch (error) {
    console.error('[searchGoogleCSE] Error:', error);
    return [];
  }
}

export async function searchGoogle(query: string, numResults: number = 20): Promise<string[]> {
  // 1. Try Exa API — primary, AI-native, 1000 free searches/month
  if (process.env.EXA_API_KEY) {
    const exaUrls = await searchExa(query, numResults);
    if (exaUrls.length > 0) return exaUrls;
    console.warn(`[searchGoogle] Exa returned 0 results — trying Google CSE`);
  }

  // 2. Try Google Custom Search — official Google results, 100 free/day
  if (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID) {
    const cseUrls = await searchGoogleCSE(query, numResults);
    if (cseUrls.length > 0) return cseUrls;
    console.warn(`[searchGoogle] Google CSE returned 0 results — trying DDG`);
  }

  // 3. Try DuckDuckGo HTML
  const ddgUrls = await searchDDGHtml(query, numResults);
  if (ddgUrls.length > 0) return ddgUrls;
  console.warn(`[searchGoogle] DuckDuckGo HTML returned 0 results — trying SearXNG Dynamic`);

  // 4. Try SearXNG dynamic rotating proxies
  const searxUrls = await searchSearXNG(query, numResults);
  if (searxUrls.length > 0) return searxUrls;
  console.warn(`[searchGoogle] SearXNG also returned 0 results — trying Serper`);

  // 5. Try Serper
  if (process.env.SERPER_API_KEY) {
    const serperUrls = await searchSerper(query, numResults);
    if (serperUrls.length > 0) return serperUrls;
  }

  console.warn(`[searchGoogle] All search engines returned 0 results for: "${query}"`);
  return [];
}

// ── SHARED SCRAPING GUIDELINES ────────────────────────────────────────────────
// These guidelines apply to ALL AI extraction across every module (jobs, tenders,
// salaries, compliance, health). They define the quality standard that ensures
// comprehensive, non-shallow data — the same standard used during the initial
// manual mass-scrape that produced rich, detailed records.
export const SCRAPING_GUIDELINES = `
GENERAL EXTRACTION QUALITY GUIDELINES (apply to every field):
1. DEPTH OVER BREVITY: Extract complete, detailed information. Never truncate or summarize
   when full content is available. A 6-sentence description is better than 1 sentence.
2. ALL FIELDS MANDATORY: Attempt to fill every field. Only return null/empty if the
   information is truly absent from the source — do not skip because it is inconvenient.
3. LANGUAGE AGNOSTIC: Extract data in ANY language (English, French, Swahili, Arabic,
   Amharic, Kinyarwanda, Kirundi, Somali). Do NOT skip non-English content.
4. NO HALLUCINATION: Never invent or estimate data not present in the source. If a field
   is unknown, use the specified default (null, 0, or empty string).
5. RESOLVE REAL URLS: When the source is an aggregator or job board, always resolve to
   the TRUE source URL (employer site, authority portal, document link) using [LINK]
   sections in the text. Never return a generic aggregator URL if a real one is visible.
6. INFER FROM CONTEXT: Use all available context (country, organization name, sector,
   surrounding text) to intelligently fill fields like currency, location, category.
   For example: if the text says "Nairobi" and mentions KES, infer currency = "KES".
7. PDF/DOCUMENT & IMAGE FLYER CONTENT: If document text or image flyer/scan text is
   appended below the main content, treat it as equally valid source material. Extract all
   data points found in attached PDFs, Word documents, Excel schedules, or image flyers.
8. MULTIPLE RECORDS: A single page often contains many listings. Extract ALL of them,
   not just the first one or the most prominent.
`;

/**
 * Uses AI to extract Job postings from scraped text.
 * Applies shared SCRAPING_GUIDELINES for comprehensive, non-shallow extraction.
 */
export async function extractJobsWithAI(text: string, sourceUrl: string): Promise<BroadJobResource[]> {
  if (!text || text.length < 50) return [];

    const prompt = `You are a specialized AI assistant that extracts job postings from raw website text.
Source URL: ${sourceUrl}

${SCRAPING_GUIDELINES}

Scraped content:
${text.substring(0, 20000)}

JOB-SPECIFIC EXTRACTION RULES:
- Extract up to 15 real job postings found in the text. Extract ALL jobs visible, not just the first.
- For 'companyName': DO NOT use the name of job boards or aggregators. Find the actual hiring
  organization or company. If completely unknown, return 'Unknown'.
- For 'description': Provide the FULL, comprehensive original content of the role as found in the source text. Do NOT summarize or truncate. Include all paragraphs detailing primary duties, responsibilities, reporting line, deliverables, work environment, and any other relevant information. We need the full comprehensive text to provide maximum value to the user.
- For 'requirements': Extract ALL qualifications and experience required: education level, years
  of experience, specific skills, certifications, software tools, languages, and any other
  criteria. Separate requirements with semicolons. Use empty string ONLY if truly none stated.
- For 'location': City or region (e.g., "Nairobi", "Dar es Salaam"). Use empty string if none.
- For 'countryCode': The 2-letter ISO country code where the job is located (e.g. "TZ", "MG", "KE"). 
  Infer from text, location, or currency. Use empty string ONLY if completely unknown.
- For 'jobType': Must be one of: full_time, part_time, contract, internship, remote.
  Infer from context: "volunteer" → contract, "attaché" → internship, "CDI/permanent" → full_time.
- For 'sourceUrl': If this page is an aggregator or job board, look for an "Apply Here",
  "Visit Website", or original employer link in the [LINK] sections and return the TRUE origin URL.
  If it's already the employer's site or no origin link exists, return the provided Source URL.
- For 'postedDateIsoString': ISO 8601 date when the job was posted if found, otherwise empty string.
- For 'deadlineIsoString': ISO 8601 deadline/closing date if found, otherwise empty string.
  Look for: "deadline", "closing date", "apply by", "date limite", "tarehe ya mwisho".
- For 'salaryMin': Minimum salary as a plain number (no currency symbol) if stated, otherwise 0.
- For 'salaryMax': Maximum salary as a plain number if stated, otherwise 0. If only one salary
  figure is given, use it for BOTH min and max.
- For 'salaryCurrency': ISO 4217 code (e.g. "KES", "TZS", "UGX", "RWF", "ETB", "CDF", "USD").
  Infer from context, country, or organization name if not stated explicitly.
  Use empty string ONLY if salary is completely absent from the text.
- Return empty array if no real job postings found.
`;

  // Fast-path deterministic pre-extraction
  const deterministic = extractDeterministicJobFields(text, sourceUrl);

  try {
    const { object } = await generateObjectWithFallback({
      schema: z.object({
        jobs: z.array(z.object({
          title: z.string(),
          companyName: z.string(),
          description: z.string(),
          requirements: z.string(),
          location: z.string(),
          jobType: z.enum(['full_time', 'part_time', 'contract', 'internship', 'remote']),
          sourceUrl: z.string(),
          postedDateIsoString: z.string(),
          deadlineIsoString: z.string(),
          salaryMin: z.number().default(0),
          salaryMax: z.number().default(0),
          salaryCurrency: z.string().default(''),
          countryCode: z.string().default(''),
        }))
      }),
      prompt,
      maxTokens: 8192,
    });

    const rawJobs = (object.jobs || []).map((job: {
      title: string; companyName: string; description: string; requirements: string;
      location: string; jobType: BroadJobResource['jobType']; sourceUrl: string;
      postedDateIsoString: string; deadlineIsoString: string; salaryMin: number; salaryMax: number; salaryCurrency: string; countryCode: string;
    }) => {
      let parsedPosted = null;
      if (job.postedDateIsoString && job.postedDateIsoString.trim()) {
        const d = new Date(job.postedDateIsoString);
        if (!isNaN(d.getTime())) parsedPosted = d;
      }
      let parsedDeadline = null;
      if (job.deadlineIsoString && job.deadlineIsoString.trim()) {
        const d = new Date(job.deadlineIsoString);
        if (!isNaN(d.getTime())) parsedDeadline = d;
      }
      // Merge deterministic deadline or salary if AI missed them
      if (!parsedDeadline && deterministic.deadline) {
        parsedDeadline = deterministic.deadline;
      }
      const salaryMin = job.salaryMin > 0 ? job.salaryMin : (deterministic.salaryMin ?? null);
      const salaryMax = job.salaryMax > 0 ? job.salaryMax : (deterministic.salaryMax ?? null);
      const salaryCurrency = job.salaryCurrency?.trim() || deterministic.salaryCurrency || null;
      const requirements = (job.requirements && job.requirements.trim()) || deterministic.requirements || null;

      return {
        ...job,
        requirements,
        parsedPosted,
        parsedDeadline,
        salaryMin,
        salaryMax,
        salaryCurrency,
      };
    });

    const normalizedJobs = await Promise.all(
      rawJobs.map(async (job: any, idx: number) => {
        const regionId = await normalizeLocationAndGetRegionId(job.location);
        const slug = `${job.title || 'job'}-${job.companyName || ''}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 45).replace(/^-|-$/g, '');
        const hasSpecificUrl = job.sourceUrl && job.sourceUrl.startsWith('http') && job.sourceUrl !== sourceUrl;
        const uniqueSourceUrl = hasSpecificUrl ? job.sourceUrl : `${sourceUrl}#${slug}-${idx + 1}`;

        return {
          title: job.title,
          companyName: job.companyName || 'Unknown',
          description: job.description || deterministic.description,
          requirements: job.requirements,
          regionId: regionId,
          jobType: (job.jobType || 'full_time').toLowerCase().replace(/[s-]/g, '_') as BroadJobResource['jobType'],
          sourceUrl: uniqueSourceUrl,
          postedDate: job.parsedPosted,
          deadline: job.parsedDeadline,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryCurrency: job.salaryCurrency,
          countryCode: job.countryCode?.trim().toUpperCase() || null,
        };
      })
    );

    return normalizedJobs.filter(job => {
      const titleLower = (job.title || '').toLowerCase().trim();
      if (titleLower.startsWith('[link]') || titleLower.startsWith('[image:')) return false;
      return true;
    });
  } catch (err) {
    console.warn(`[extractJobsWithAI] AI extraction unavailable on ${sourceUrl} (${(err as Error).message}).`);
    // User requested NO deterministic fallback, only AI.
    return [];
  }
}

// ── Per-URL hard timeout wrapper ─────────────────────────────────────────────
// Prevents a single hung fetchHtml/Jina call from blocking the entire scrape.
async function withUrlTimeout<T>(fn: () => Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`[timeout] ${label} exceeded ${timeoutMs}ms`)), timeoutMs);
    fn().then(v => { clearTimeout(timer); resolve(v); }).catch(e => { clearTimeout(timer); reject(e); });
  });
}

/**
 * Master function to run a broad search for jobs and extract them.
 * Processes URLs in concurrent batches of 5. Each URL has a 45s hard timeout
 * to prevent a single hung Jina/fetch call from stalling the entire scrape.
 */
export async function discoverJobs(query: string, maxPages: number = 10): Promise<BroadJobResource[]> {
  console.log(`[discoverJobs] Searching for: "${query}"...`);
  const urls = await searchGoogle(query, 50);
  console.log(`[discoverJobs] Found ${urls.length} viable URLs to scrape.`);

  const allJobs: BroadJobResource[] = [];
  const CONCURRENT = 2; // 5 simultaneous fetches — avoids hammering Jina rate limits
  const urlsToProcess = urls.slice(0, maxPages);

  for (let i = 0; i < urlsToProcess.length; i += CONCURRENT) {
    const batch = urlsToProcess.slice(i, i + CONCURRENT);

    const results = await Promise.allSettled(
      batch.map(async (url) => {
        console.log(`[discoverJobs] Scraping ${url}...`);
        return withUrlTimeout(async () => {
          const html = await fetchHtml(url);
          if (!html) return [] as BroadJobResource[];
          const { text } = await htmlToTextEnriched(html, url);
          return extractJobsWithAI(text, url);
        }, 45_000, url);
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        console.log(`[discoverJobs] Extracted ${result.value.length} jobs from batch.`);
        allJobs.push(...result.value);
      } else if (result.status === 'rejected') {
        console.warn(`[discoverJobs] A URL in the batch failed: ${(result.reason as Error)?.message}`);
      }
    }

    // Polite delay between batches (not between individual URLs within a batch)
    if (i + CONCURRENT < urlsToProcess.length) {
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  console.log(`[discoverJobs] Finished. Total jobs discovered: ${allJobs.length}`);
  return allJobs;
}



