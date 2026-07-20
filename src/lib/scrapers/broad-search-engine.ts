import { generateObjectWithFallback } from '../ai/router';
import { z } from 'zod';
import { fetchHtml, htmlToText } from './compliance-base';

export interface BroadJobResource {
  title: string;
  companyName: string;
  description: string;
  requirements: string | null;
  location: string | null;
  jobType: 'full_time' | 'part_time' | 'contract' | 'internship' | 'remote';
  sourceUrl: string;
  deadline: Date | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null; // ISO 4217, e.g. "KES", "TZS"
}

/**
 * Searches Google using Serper.dev API to find relevant URLs.
 */
export async function searchGoogle(query: string, numResults: number = 100): Promise<string[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.error('SERPER_API_KEY is missing');
    return [];
  }

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        num: numResults
      })
    });

    if (!res.ok) {
      console.error(`Serper API failed: ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    if (!data.organic || !Array.isArray(data.organic)) return [];

    // Filter out standard job boards that block scrapers or aren't direct sources
    const blockedDomains = ['linkedin.com', 'glassdoor.com', 'indeed.com', 'fuzu.com', 'brightermonday.co.ke', 'myjobmag.com'];
    
    return data.organic
      .map((item: any) => item.link)
      .filter((link: string) => !blockedDomains.some(d => link.includes(d)));
  } catch (error) {
    console.error('Error searching Google:', error);
    return [];
  }
}

/**
 * Uses Gemini AI to extract Job postings from scraped text.
 */
export async function extractJobsWithAI(text: string, sourceUrl: string): Promise<BroadJobResource[]> {
  if (!text || text.length < 50) return [];

  const prompt = `You are a specialized AI assistant that extracts job postings from raw website text.
Source URL: ${sourceUrl}

Scraped content:
${text.substring(0, 8000)}

Rules:
- Extract any real job postings found in the text. Be comprehensive.
- For 'description': Include scope of work, duties and responsibilities.
- For 'requirements': Qualifications, experience needed. Use empty string if none.
- For 'location': City or region (e.g., "Nairobi"). Use empty string if none.
- For 'jobType': Must be one of: full_time, part_time, contract, internship, remote.
- For 'deadlineIsoString': ISO 8601 date if found, otherwise empty string.
- For 'salaryMin': Minimum salary as a plain number (no currency symbol) if stated, otherwise 0.
- For 'salaryMax': Maximum salary as a plain number if stated, otherwise 0. If only one figure is given, use it for both min and max.
- For 'salaryCurrency': ISO 4217 code (e.g. "KES", "TZS", "UGX", "RWF", "ETB", "USD"). Infer from context or country if not explicit. Use empty string if salary is completely absent.
- Extract all open positions found. Return empty array if none found.
`;


  try {
    const { object } = await generateObjectWithFallback({
      schema: z.object({
        jobs: z.array(z.object({
          title: z.string().min(3),
          companyName: z.string(),
          description: z.string(),
          requirements: z.string(),
          location: z.string(),
          jobType: z.enum(['full_time', 'part_time', 'contract', 'internship', 'remote']),
          sourceUrl: z.string(),
          deadlineIsoString: z.string(),
          salaryMin: z.number().default(0),
          salaryMax: z.number().default(0),
          salaryCurrency: z.string().default(''),
        }))
      }),
      prompt,
    });

    return object.jobs.map((job: any) => {
      let parsedDate = null;
      if (job.deadlineIsoString && job.deadlineIsoString.trim()) {
        const d = new Date(job.deadlineIsoString);
        if (!isNaN(d.getTime())) parsedDate = d;
      }
      return {
        title: job.title,
        companyName: job.companyName || 'Unknown',
        description: job.description,
        requirements: job.requirements || null,
        location: job.location || null,
        jobType: job.jobType,
        sourceUrl: job.sourceUrl,
        deadline: parsedDate,
        salaryMin: job.salaryMin > 0 ? job.salaryMin : null,
        salaryMax: job.salaryMax > 0 ? job.salaryMax : null,
        salaryCurrency: job.salaryCurrency?.trim() || null,
      };
    });
  } catch (err) {
    console.error(`[extractJobsWithAI] Failed on ${sourceUrl}:`, (err as Error).message);
    return [];
  }
}

/**
 * Master function to run a broad search for jobs and extract them.
 */
export async function discoverJobs(query: string, maxPages: number = 100): Promise<BroadJobResource[]> {
  console.log(`[discoverJobs] Searching for: "${query}"...`);
  const urls = await searchGoogle(query, 100);
  console.log(`[discoverJobs] Found ${urls.length} viable URLs to scrape.`);

  const allJobs: BroadJobResource[] = [];
  let pagesProcessed = 0;

  for (const url of urls) {
    if (pagesProcessed >= maxPages) break;
    
    console.log(`[discoverJobs] Scraping ${url}...`);
    const html = await fetchHtml(url);
    if (!html) continue;

    const text = htmlToText(html, url);
    const jobs = await extractJobsWithAI(text, url);
    
    if (jobs.length > 0) {
      console.log(`[discoverJobs] Extracted ${jobs.length} jobs from ${url}`);
      allJobs.push(...jobs);
    }
    
    pagesProcessed++;
    // Polite delay: 4s between pages keeps us well under the 20 req/min Gemini free-tier limit
    await new Promise(res => setTimeout(res, 4000));
  }

  console.log(`[discoverJobs] Finished. Total jobs discovered: ${allJobs.length}`);
  return allJobs;
}
