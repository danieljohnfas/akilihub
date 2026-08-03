import { generateObjectWithFallback } from '../ai/router';
import { z } from 'zod';
import { fetchHtml, htmlToTextEnriched, fetchAndParseDocument } from './compliance-base';
import { searchGoogle, SCRAPING_GUIDELINES } from './broad-search-engine';

export interface BroadHealthResource {
  indicatorCode: string;
  indicatorName: string;
  unit: string;
  category: 'maternal' | 'child' | 'infectious' | 'general';
  value: number;
  year: number;
  sourceUrl: string;
}

export async function extractHealthWithAI(
  text: string,
  sourceUrl: string,
  pdfLinks: string[] = [],
): Promise<BroadHealthResource[]> {
  if (!text || text.length < 50) return [];

  // Enrich with PDF/DOCX document text (health reports, bulletins, WHO docs)
  let enrichedText = text;
  for (const pdfUrl of pdfLinks.slice(0, 3)) {
    try {
      const docText = await fetchAndParseDocument(pdfUrl);
      if (docText && docText.length > 50) {
        enrichedText += `\n\n--- HEALTH DOCUMENT (${pdfUrl}) ---\n${docText.substring(0, 8000)}`;
        console.log(`[extractHealthWithAI] Enriched with ${docText.length} chars from ${pdfUrl}`);
      }
    } catch {
      // ignore
    }
  }

  const prompt = `You are a specialized AI assistant that extracts public health data and statistics from raw website text.
Source URL: ${sourceUrl}

${SCRAPING_GUIDELINES}

Scraped content:
${enrichedText.substring(0, 12000)}

HEALTH DATA EXTRACTION RULES:
- Extract up to 20 health indicators, statistics, or metrics. Extract ALL data points visible,
  including those in tables, lists, charts descriptions, and footnotes.
- For 'indicatorCode': A short standardized code (e.g. "MMR", "U5MR", "ANC4", "HIV_PREV").
  Use WHO standard codes where applicable. If none, generate a 3-5 letter acronym from the name.
- For 'indicatorName': The FULL official name of the indicator
  (e.g. "Maternal Mortality Ratio", "Under-5 Mortality Rate", "HIV Prevalence").
- For 'unit': The precise unit of measurement (e.g. "per 100,000 live births", "%",
  "per 1,000 live births", "cases per 100,000 population"). Be specific, not generic.
- For 'category': Must be one of: maternal, child, infectious, general.
  Examples: maternal mortality/ANC → maternal; u5/neonatal → child; HIV/malaria/TB → infectious.
- For 'value': The actual numeric statistic. Extract exact values from tables/text.
  Do NOT average or estimate. If a range is given (e.g. 120-180), use the midpoint.
- For 'year': The year the data represents. Look for publication year, survey year (DHS, MICS),
  or reporting period. If not stated, use the most recent plausible year (2023 or 2024).
- Return empty array if no health statistics or indicators are found.
`;

  try {
    const { object } = await generateObjectWithFallback({
      schema: z.object({
        dataPoints: z.array(z.object({
          indicatorCode: z.string(),
          indicatorName: z.string(),
          unit: z.string(),
          category: z.enum(['maternal', 'child', 'infectious', 'general']),
          value: z.number(),
          year: z.number(),
        }))
      }),
      prompt,
    });

    if (!object || !object.dataPoints) return [];

    return object.dataPoints.map((dp: any) => ({
      indicatorCode: dp.indicatorCode,
      indicatorName: dp.indicatorName,
      unit: dp.unit,
      category: dp.category,
      value: dp.value,
      year: dp.year,
      sourceUrl,
    }));
  } catch (err) {
    console.error(`[extractHealthWithAI] Failed on ${sourceUrl}:`, (err as Error).message);
    return [];
  }
}

export async function discoverHealth(query: string, maxPages: number = 5): Promise<BroadHealthResource[]> {
  console.log(`[discoverHealth] Searching for: "${query}"...`);
  const urls = await searchGoogle(query, 20);
  console.log(`[discoverHealth] Found ${urls.length} viable URLs to scrape.`);

  const allData: BroadHealthResource[] = [];
  let pagesProcessed = 0;

  for (const url of urls) {
    if (pagesProcessed >= maxPages) break;

    console.log(`[discoverHealth] Scraping ${url}...`);
    const html = await fetchHtml(url);
    if (!html) continue;

    const { text, pdfLinks } = await htmlToTextEnriched(html, url);
    const data = await extractHealthWithAI(text, url, pdfLinks);

    if (data.length > 0) {
      console.log(`[discoverHealth] Extracted ${data.length} health data points from ${url}`);
      allData.push(...data);
    }

    pagesProcessed++;
    await new Promise(res => setTimeout(res, 2000));
  }

  console.log(`[discoverHealth] Finished. Total health data points discovered: ${allData.length}`);
  return allData;
}
