import { generateObjectWithFallback } from '../ai/router';
import { z } from 'zod';
import { fetchHtml, htmlToTextEnriched } from './compliance-base';
import { searchGoogle } from './broad-search-engine';

export interface BroadHealthResource {
  indicatorCode: string;
  indicatorName: string;
  unit: string;
  category: 'maternal' | 'child' | 'infectious' | 'general';
  value: number;
  year: number;
  sourceUrl: string;
}

export async function extractHealthWithAI(text: string, sourceUrl: string): Promise<BroadHealthResource[]> {
  if (!text || text.length < 50) return [];

  const prompt = `You are a specialized AI assistant that extracts public health data and statistics from raw website text.
Source URL: ${sourceUrl}

Scraped content:
${text.substring(0, 12000)}

Rules:
- Extract any health indicators, statistics, or metrics found in the text. Be comprehensive.
- For 'indicatorCode': A short code (e.g. "MMR", "U5MR"). If none, generate a short 3-4 letter acronym based on the name.
- For 'indicatorName': The full name (e.g. "Maternal Mortality Ratio").
- For 'unit': The unit of measurement (e.g. "per 100,000 live births", "%").
- For 'category': Must be one of: maternal, child, infectious, general.
- For 'value': The actual statistic or number as a float/integer.
- For 'year': The year the data represents (e.g. 2023). If not stated, use 2024.
- Extract all health data points found. Return empty array if none found.
- If 'unit' is unknown, use "count".
- If 'category' is unknown, use "general".
- If 'year' is unknown, use 2024.
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

export async function discoverHealth(query: string, maxPages: number = 3): Promise<BroadHealthResource[]> {
  console.log(`[discoverHealth] Searching for: "${query}"...`);
  const urls = await searchGoogle(query, 10);
  console.log(`[discoverHealth] Found ${urls.length} viable URLs to scrape.`);

  const allData: BroadHealthResource[] = [];
  let pagesProcessed = 0;

  for (const url of urls) {
    if (pagesProcessed >= maxPages) break;

    console.log(`[discoverHealth] Scraping ${url}...`);
    const html = await fetchHtml(url);
    if (!html) continue;

    const { text } = await htmlToTextEnriched(html, url);
    const data = await extractHealthWithAI(text, url);

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
