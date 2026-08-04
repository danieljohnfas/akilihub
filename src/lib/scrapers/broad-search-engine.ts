import { generateObjectWithFallback } from '../ai/router';
import { normalizeLocationAndGetRegionId } from '../ai/location';
import { z } from 'zod';
import { fetchHtml, htmlToTextEnriched } from './compliance-base';
import { getAllAggregatorDomains } from '../sources/aggregators';

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
}

// ── Blocked domains: all known aggregator domains (sourced from registry) ──────
// ATS platforms are NOT included here — they can appear in search results as
// they are the employer's own hiring system.
const BLOCKED_DOMAINS = getAllAggregatorDomains();

// ── DuckDuckGo search via Python sidecar (free, no API key) ───────────────────
async function searchDDGS(query: string, numResults: number): Promise<string[]> {
  const sidecarUrl = (process.env.SCRAPLING_URL ?? 'http://localhost:8001').trim();

  try {
    const res = await fetch(`${sidecarUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim(), max_results: numResults, region: 'wt-wt', time_limit: 'm' }),
      signal: AbortSignal.timeout(12_000), // 12s — enough time for Render cold start
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    if (!data.success || !Array.isArray(data.results)) return [];

    const urls: string[] = data.results
      .map((r: { url?: string }) => r.url)
      .filter((u: string | undefined) => !!u && !BLOCKED_DOMAINS.some(d => u.includes(d)));

    console.log(`[searchDDGS] DuckDuckGo returned ${urls.length} URLs for: "${query}"`);
    return urls;
  } catch {
    return [];
  }
}

// ── Serper.dev fallback (paid, used only when SERPER_API_KEY is set and ddgs fails) ──
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

/**
 * Searches for relevant URLs.
 *
 * Priority order (designed for Vercel + Render sidecar architecture):
 *   1. Serper.dev  — always available, instant, used when SERPER_API_KEY is set
 *   2. DuckDuckGo via Python sidecar — free but requires sidecar to be warm
 *
 * Rationale: SERPER_API_KEY is set in Vercel Production + Preview. The sidecar
 * (Render free tier) cold-starts in 30-60s, but the old timeout was only 4s.
 * This was silently killing tenders and compliance scrapers for 12+ days.
 */
export async function searchGoogle(query: string, numResults: number = 20): Promise<string[]> {
  // 1. Try Serper first — it's instant and always available when key is set
  if (process.env.SERPER_API_KEY) {
    const serperUrls = await searchSerper(query, numResults);
    if (serperUrls.length > 0) return serperUrls;
    console.warn(`[searchGoogle] Serper returned 0 results — trying DuckDuckGo sidecar`);
  }

  // 2. DuckDuckGo via sidecar (free fallback)
  const ddgsUrls = await searchDDGS(query, numResults);
  if (ddgsUrls.length > 0) return ddgsUrls;

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
7. PDF/DOCUMENT CONTENT: If document text is appended below the main content, treat it
   as equally valid source material. Extract all data points found in PDFs/documents.
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
${text.substring(0, 12000)}

JOB-SPECIFIC EXTRACTION RULES:
- Extract up to 15 real job postings found in the text. Extract ALL jobs visible, not just the first.
- For 'companyName': DO NOT use the name of job boards or aggregators. Find the actual hiring
  organization or company. If completely unknown, return 'Unknown'.
- For 'description': Provide a FULL, detailed summary of the role including: primary duties and
  responsibilities, reporting line if stated, key deliverables, work environment, and any unique
  aspects of the role. Aim for 3-6 sentences. Do not truncate if more detail is available.
- For 'requirements': Extract ALL qualifications and experience required: education level, years
  of experience, specific skills, certifications, software tools, languages, and any other
  criteria. Separate requirements with semicolons. Use empty string ONLY if truly none stated.
- For 'location': City or region (e.g., "Nairobi", "Dar es Salaam"). Use empty string if none.
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
        }))
      }),
      prompt,
    });

    const rawJobs = object.jobs.map((job: {
      title: string; companyName: string; description: string; requirements: string;
      location: string; jobType: BroadJobResource['jobType']; sourceUrl: string;
      postedDateIsoString: string; deadlineIsoString: string; salaryMin: number; salaryMax: number; salaryCurrency: string;
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
      return {
        ...job,
        parsedPosted,
        parsedDeadline
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
          description: job.description,
          requirements: job.requirements || null,
          regionId: regionId,
          jobType: job.jobType,
          sourceUrl: uniqueSourceUrl,
          postedDate: job.parsedPosted,
          deadline: job.parsedDeadline,
          salaryMin: job.salaryMin > 0 ? job.salaryMin : null,
          salaryMax: job.salaryMax > 0 ? job.salaryMax : null,
          salaryCurrency: job.salaryCurrency?.trim() || null,
        };
      })
    );

    return normalizedJobs;
  } catch (err) {
    console.error(`[extractJobsWithAI] Failed on ${sourceUrl}:`, (err as Error).message);
    return [];
  }
}

/**
 * Master function to run a broad search for jobs and extract them.
 */
export async function discoverJobs(query: string, maxPages: number = 5): Promise<BroadJobResource[]> {
  console.log(`[discoverJobs] Searching for: "${query}"...`);
  const urls = await searchGoogle(query, 25);
  console.log(`[discoverJobs] Found ${urls.length} viable URLs to scrape.`);

  const allJobs: BroadJobResource[] = [];
  let pagesProcessed = 0;

  for (const url of urls) {
    if (pagesProcessed >= maxPages) break;

    console.log(`[discoverJobs] Scraping ${url}...`);
    const html = await fetchHtml(url);
    if (!html) continue;

    const { text } = await htmlToTextEnriched(html, url);
    const extractedJobs = await extractJobsWithAI(text, url);

    if (extractedJobs.length > 0) {
      console.log(`[discoverJobs] Extracted ${extractedJobs.length} jobs from ${url}`);
      allJobs.push(...extractedJobs);
    }

    pagesProcessed++;
    // Polite delay between pages
    await new Promise(res => setTimeout(res, 3000));
  }

  console.log(`[discoverJobs] Finished. Total jobs discovered: ${allJobs.length}`);
  return allJobs;
}
