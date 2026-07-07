import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
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
}

/**
 * Searches Google using Serper.dev API to find relevant URLs.
 */
export async function searchGoogle(query: string, numResults: number = 10): Promise<string[]> {
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
${text.substring(0, 12000)}

Rules:
- Extract any real job postings found in the text.
- If multiple jobs are listed, extract all of them.
- Only extract actual open positions, not historical data or general company descriptions.
- Ensure the source URL is correct (use the provided Source URL unless a specific direct link is found).
- If no jobs are found, return an empty array.
`;

  try {
    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: z.object({
        jobs: z.array(z.object({
          title: z.string().min(3),
          companyName: z.string().min(2),
          description: z.string(),
          requirements: z.string().nullable(),
          location: z.string().nullable(),
          jobType: z.enum(['full_time', 'part_time', 'contract', 'internship', 'remote']),
          sourceUrl: z.string().url(),
          deadlineIsoString: z.string().nullable().describe("ISO 8601 format if found, else null"),
        }))
      }),
      prompt,
    });

    return object.jobs.map(job => ({
      ...job,
      deadline: job.deadlineIsoString ? new Date(job.deadlineIsoString) : null
    }));
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
  const urls = await searchGoogle(query, 10);
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
