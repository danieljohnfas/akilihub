import { generateObjectWithFallback } from '../ai/router';
import { normalizeLocationAndGetRegionId } from '../ai/location';
import { z } from 'zod';
import { fetchHtml, htmlToTextEnriched } from './compliance-base';

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

// ── Blocked job board domains (block heavy aggregators / bot blockers) ──
const BLOCKED_DOMAINS = [
  'linkedin.com', 'glassdoor.com', 'indeed.com', 'fuzu.com',
  'brightermonday.co.ke', 'jobwebkenya.com', 'ziprecruiter.com',
  'simplyhired.com', 'rozee.pk', 'unjobs.org'
];

// ── DuckDuckGo search via Python sidecar (free, no API key) ───────────────────
async function searchDDGS(query: string, numResults: number): Promise<string[]> {
  const sidecarUrl = (process.env.SCRAPLING_URL ?? 'http://localhost:8001').trim();

  try {
    const res = await fetch(`${sidecarUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim(), max_results: numResults, region: 'wt-wt', time_limit: 'm' }),
      signal: AbortSignal.timeout(4_000),
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
    const cleanQuery = query.replace(/\bsite:/gi, '').trim();
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: cleanQuery, num: Math.min(Math.max(numResults, 10), 100) }),
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
 * Primary:  DuckDuckGo via Python sidecar (FREE — no API key needed)
 * Fallback: Serper.dev (only if SERPER_API_KEY is set and ddgs returns 0 results)
 */
export async function searchGoogle(query: string, numResults: number = 20): Promise<string[]> {
  // Always try DuckDuckGo first (free)
  const ddgsUrls = await searchDDGS(query, numResults);
  if (ddgsUrls.length > 0) return ddgsUrls;

  // Serper fallback (only if key is available)
  if (process.env.SERPER_API_KEY) {
    console.log(`[searchGoogle] DuckDuckGo returned 0 results — falling back to Serper`);
    const serperUrls = await searchSerper(query, numResults);
    if (serperUrls.length > 0) return serperUrls;
  }

  console.warn(`[searchGoogle] All search engines returned 0 results for: "${query}"`);
  return [];
}

/**
 * Uses AI to extract Job postings from scraped text.
 */
export async function extractJobsWithAI(text: string, sourceUrl: string): Promise<BroadJobResource[]> {
  if (!text || text.length < 50) return [];

    const prompt = `You are a specialized AI assistant that extracts job postings from raw website text.
Source URL: ${sourceUrl}

Scraped content:
${text.substring(0, 8000)}

Rules:
- Extract up to 15 real job postings found in the text.
- For 'companyName': DO NOT use the name of job boards or aggregators. Find the actual hiring organization or company. If completely unknown, return 'Unknown'.
- For 'description': Provide a clear summary of the role, duties, and responsibilities (2-4 sentences).
- For 'requirements': Qualifications, experience needed. Use empty string if none.
- For 'location': City or region (e.g., "Nairobi"). Use empty string if none.
- For 'jobType': Must be one of: full_time, part_time, contract, internship, remote.
- For 'sourceUrl': If this page is an aggregator or job board, look for an "Apply Here", "Visit Website", or original employer link in the [LINK] sections and return the TRUE origin URL. If it's already the employer's site or no origin link exists, return the provided Source URL.
- For 'postedDateIsoString': ISO 8601 date when the job was posted if found, otherwise empty string.
- For 'deadlineIsoString': ISO 8601 deadline date if found, otherwise empty string.
- For 'salaryMin': Minimum salary as a plain number (no currency symbol) if stated, otherwise 0.
- For 'salaryMax': Maximum salary as a plain number if stated, otherwise 0. If only one figure is given, use it for both min and max.
- For 'salaryCurrency': ISO 4217 code (e.g. "KES", "TZS", "UGX", "RWF", "ETB", "USD"). Infer from context or country if not explicit. Use empty string if salary is completely absent.
- Return empty array if no jobs found.
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
  const urls = await searchGoogle(query, 20);
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
