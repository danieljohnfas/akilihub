import { generateObjectWithFallback } from '../ai/router';
import { z } from 'zod';
import { fetchHtml, htmlToText } from './compliance-base';
import { searchGoogle } from './broad-search-engine';

export interface BroadTenderResource {
  referenceNo: string;
  title: string;
  description: string | null;
  contractingAuthority: string;
  category: 'goods' | 'works' | 'services' | 'consultancy';
  budget: number | null;
  currency: string;
  deadline: Date | null;
  sourceUrl: string;
}

export async function extractTendersWithAI(text: string, sourceUrl: string): Promise<BroadTenderResource[]> {
  if (!text || text.length < 50) return [];

  const prompt = `You are a specialized AI assistant that extracts government tender (procurement) opportunities from raw website text.
Source URL: ${sourceUrl}

Scraped content:
${text.substring(0, 12000)}

Rules:
- Extract any real tender, bid, or procurement postings found in the text.
- If multiple tenders are listed, extract all of them.
- Only extract open, active tenders.
- Ensure the source URL is correct (use the provided Source URL unless a specific direct link is found).
- If no tenders are found, return an empty array.
- For referenceNo, if none is explicitly provided, use a short slugified version of the title or generate a unique looking string from the text.
- Try to classify the category as goods, works, services, or consultancy.
`;

  try {
    const { object } = await generateObjectWithFallback({
      schema: z.object({
        tenders: z.array(z.object({
          referenceNo: z.string().min(3),
          title: z.string().min(5),
          description: z.string().nullable(),
          contractingAuthority: z.string().min(2),
          category: z.enum(['goods', 'works', 'services', 'consultancy']),
          budgetNumber: z.number().nullable().describe("Numeric budget if specified, else null"),
          currency: z.string().default('USD'),
          sourceUrl: z.string().url(),
          deadlineIsoString: z.string().nullable().describe("ISO 8601 format if found, else null"),
        }))
      }),
      prompt,
    });

    return object.tenders.map((tender: { referenceNo: string; title: string; description: string | null; contractingAuthority: string; category: BroadTenderResource['category']; budgetNumber: number | null; currency: string; sourceUrl: string; deadlineIsoString: string | null }) => ({
      referenceNo: tender.referenceNo,
      title: tender.title,
      description: tender.description,
      contractingAuthority: tender.contractingAuthority,
      category: tender.category,
      budget: tender.budgetNumber,
      currency: tender.currency,
      sourceUrl: tender.sourceUrl,
      deadline: tender.deadlineIsoString ? new Date(tender.deadlineIsoString) : null
    }));
  } catch (err) {
    console.error(`[extractTendersWithAI] Failed on ${sourceUrl}:`, (err as Error).message);
    return [];
  }
}

export async function discoverTenders(query: string, maxPages: number = 100): Promise<BroadTenderResource[]> {
  console.log(`[discoverTenders] Searching for: "${query}"...`);
  const urls = await searchGoogle(query, 100);
  console.log(`[discoverTenders] Found ${urls.length} viable URLs to scrape.`);

  const allTenders: BroadTenderResource[] = [];
  let pagesProcessed = 0;

  for (const url of urls) {
    if (pagesProcessed >= maxPages) break;
    
    console.log(`[discoverTenders] Scraping ${url}...`);
    const html = await fetchHtml(url);
    if (!html) continue;

    const text = htmlToText(html, url);
    const tenders = await extractTendersWithAI(text, url);
    
    if (tenders.length > 0) {
      console.log(`[discoverTenders] Extracted ${tenders.length} tenders from ${url}`);
      allTenders.push(...tenders);
    }
    
    pagesProcessed++;
    // Polite delay: 4s between pages
    await new Promise(res => setTimeout(res, 4000));
  }

  console.log(`[discoverTenders] Finished. Total tenders discovered: ${allTenders.length}`);
  return allTenders;
}
