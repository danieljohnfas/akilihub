import { generateObjectWithFallback } from '../ai/router';
import { z } from 'zod';
import { fetchHtml, htmlToTextEnriched } from './compliance-base';
import { searchGoogle, SCRAPING_GUIDELINES } from './broad-search-engine';

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

${SCRAPING_GUIDELINES}

Scraped content:
${text.substring(0, 12000)}

SALARY-SPECIFIC EXTRACTION RULES:
- Extract up to 20 real salary or compensation benchmarks. Extract ALL salary data points visible.
- The source may be in ANY language. Extract all data regardless of language.
- For 'jobTitle': The specific role. Keep in the original language of the source.
- For 'employerName': The company or organization name. If a generalized benchmark or survey,
  use "Market Average" or the survey name (e.g. "Salary Survey 2026").
- For 'jobCategoryName': ALWAYS use a broad English category regardless of source language:
  "Engineering", "Healthcare", "Finance", "Education", "Legal", "Management",
  "Sales & Marketing", "Administration", "Construction", "Agriculture",
  "Hospitality", "Transport", "Technology", "General".
- For 'experienceLevel': Must be one of: entry (0-2 yrs), mid (3-6 yrs), senior (7-12 yrs),
  executive (12+ yrs or director/C-suite). Infer from context ("junior", "senior", "head of").
- For 'employmentType': Must be one of: full_time, part_time, contract, consultancy.
- For 'currency': ISO 4217 (e.g. "KES", "TZS", "UGX", "RWF", "ETB", "CDF", "SOS", "SSP", "USD").
  INFER from context — a salary in Kenya is almost certainly KES, Tanzania is TZS, etc.
- For 'grossMonthlySalary': Monthly gross as a plain number. If stated annually, divide by 12.
  If given as a range (e.g. 50,000-80,000), use the MIDPOINT.
- For 'netMonthlySalary': Net/take-home salary if stated, otherwise 0 (maps to null).
- For 'yearsOfExperience': Integer. If a range (1-3 yrs), use the midpoint rounded. If unknown, use 0.
- Return empty array if no salary data found.
`;

  try {
    const { object } = await generateObjectWithFallback({
      schema: z.object({
        salaries: z.array(z.object({
          jobTitle: z.string(),
          employerName: z.string(),
          jobCategoryName: z.string(),
          experienceLevel: z.enum(['entry', 'mid', 'senior', 'executive']),
          employmentType: z.enum(['full_time', 'part_time', 'contract', 'consultancy']),
          currency: z.string(),
          grossMonthlySalary: z.number(),
          netMonthlySalary: z.number(),
          yearsOfExperience: z.number(),
        }))
      }),
      prompt,
    });

    if (!object || !object.salaries) return [];

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

export async function discoverSalaries(query: string, maxPages: number = 5): Promise<BroadSalaryResource[]> {
  console.log(`[discoverSalaries] Searching for: "${query}"...`);
  const urls = await searchGoogle(query, 20);
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
