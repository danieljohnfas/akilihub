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
${text.substring(0, 8000)}

Rules:
- Extract up to 20 real salary or compensation benchmarks found in the text.
- The source may be in ANY language (English, French, Arabic, Swahili, etc.). Extract all data regardless of language.
- For 'jobTitle': The specific role or job title. Keep it in the original language of the source (e.g. "Développeur Logiciel", "Software Engineer").
- For 'employerName': The name of the company or organization. If generalized benchmark, use "Market Average".
- For 'jobCategoryName': ALWAYS use a broad English category name regardless of the source language. Use one of: "Engineering", "Healthcare", "Finance", "Education", "Legal", "Management", "Sales & Marketing", "Administration", "Construction", "Agriculture", "Hospitality", "Transport", "General".
- For 'experienceLevel': Must be one of: entry, mid, senior, executive.
- For 'employmentType': Must be one of: full_time, part_time, contract, consultancy.
- For 'currency': ISO 4217 code (e.g. "KES", "TZS", "UGX", "RWF", "ETB", "CDF", "USD"). Infer from context if not explicit.
- For 'grossMonthlySalary': The monthly gross salary as a plain number. If given annually, divide by 12.
- For 'netMonthlySalary': The net salary if stated, otherwise 0 (will map to null).
- For 'yearsOfExperience': A whole number (integer). If given as a range (e.g. 1-3 years), use the midpoint rounded to the nearest integer. If unknown, use 0.
- Return empty array if none found.
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
