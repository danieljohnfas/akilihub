import { generateObjectWithFallback } from '../ai/router';
import { z } from 'zod';
import { fetchHtml, htmlToTextEnriched } from './compliance-base';
import { searchGoogle } from './broad-search-engine';

export interface BroadSalaryResource {
  jobTitle: string;
  employerName: string;
  jobCategoryName: string;
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  employmentType: 'full_time' | 'part_time' | 'contract' | 'consultancy';
  currency: string;
  grossMonthlySalary: number;
  netMonthlySalary: number | null;
  yearsOfExperience: number | null;
  sourceUrl: string;
}

export async function extractSalariesWithAI(text: string, sourceUrl: string): Promise<BroadSalaryResource[]> {
  if (!text || text.length < 50) return [];

  const prompt = `You are a specialized AI assistant that extracts salary and compensation data from raw website text.
Source URL: ${sourceUrl}

Scraped content:
${text.substring(0, 12000)}

Rules:
- Extract any real salary or compensation benchmarks found in the text. Be comprehensive.
- For 'jobTitle': The specific role or job title (e.g. "Senior Software Engineer").
- For 'employerName': The name of the company or organization. If generalized benchmark, use "Market Average".
- For 'jobCategoryName': A broad category like "Engineering", "Healthcare", "Finance".
- For 'experienceLevel': Must be one of: entry, mid, senior, executive.
- For 'employmentType': Must be one of: full_time, part_time, contract, consultancy.
- For 'currency': ISO 4217 code (e.g. "KES", "TZS", "UGX", "RWF", "ETB", "USD"). Infer from context if not explicit.
- For 'grossMonthlySalary': The monthly gross salary as a plain number. If given annually, divide by 12.
- For 'netMonthlySalary': The net salary if stated, otherwise 0 (will map to null).
- For 'yearsOfExperience': Years required or possessed, otherwise 0.
- Extract all salary data points found. Return empty array if none found.
`;

  try {
    const { object } = await generateObjectWithFallback({
      schema: z.object({
        salaries: z.array(z.object({
          jobTitle: z.string().min(3),
          employerName: z.string().default('Market Average'),
          jobCategoryName: z.string().default('General'),
          experienceLevel: z.enum(['entry', 'mid', 'senior', 'executive']),
          employmentType: z.enum(['full_time', 'part_time', 'contract', 'consultancy']).default('full_time'),
          currency: z.string().default('USD'),
          grossMonthlySalary: z.number().min(1),
          netMonthlySalary: z.number().default(0),
          yearsOfExperience: z.number().default(0),
        }))
      }),
      prompt,
    });

    return object.salaries.map((s: any) => ({
      jobTitle: s.jobTitle,
      employerName: s.employerName,
      jobCategoryName: s.jobCategoryName,
      experienceLevel: s.experienceLevel,
      employmentType: s.employmentType,
      currency: s.currency,
      grossMonthlySalary: s.grossMonthlySalary,
      netMonthlySalary: s.netMonthlySalary > 0 ? s.netMonthlySalary : null,
      yearsOfExperience: s.yearsOfExperience > 0 ? s.yearsOfExperience : null,
      sourceUrl,
    }));
  } catch (err) {
    console.error(`[extractSalariesWithAI] Failed on ${sourceUrl}:`, (err as Error).message);
    return [];
  }
}

export async function discoverSalaries(query: string, maxPages: number = 3): Promise<BroadSalaryResource[]> {
  console.log(`[discoverSalaries] Searching for: "${query}"...`);
  const urls = await searchGoogle(query, 10);
  console.log(`[discoverSalaries] Found ${urls.length} viable URLs to scrape.`);

  const allSalaries: BroadSalaryResource[] = [];
  let pagesProcessed = 0;

  for (const url of urls) {
    if (pagesProcessed >= maxPages) break;

    console.log(`[discoverSalaries] Scraping ${url}...`);
    const html = await fetchHtml(url);
    if (!html) continue;

    const { text } = await htmlToTextEnriched(html, url);
    const salaries = await extractSalariesWithAI(text, url);

    if (salaries.length > 0) {
      console.log(`[discoverSalaries] Extracted ${salaries.length} salaries from ${url}`);
      allSalaries.push(...salaries);
    }

    pagesProcessed++;
    await new Promise(res => setTimeout(res, 2000));
  }

  console.log(`[discoverSalaries] Finished. Total salaries discovered: ${allSalaries.length}`);
  return allSalaries;
}
