import { generateObjectWithFallback } from '../ai/router';
import { normalizeLocationAndGetRegionId } from '../ai/location';
import { z } from 'zod';
import { fetchHtml, htmlToTextEnriched } from './compliance-base';
import { searchGoogle } from './broad-search-engine';

export interface BroadTenderResource {
  referenceNo: string;
  title: string;
  description: string | null;
  contractingAuthority: string;
  category: 'goods' | 'works' | 'services' | 'consultancy';
  regionId: string | null;
  budget: number | null;
  currency: string;
  deadline: Date | null;
  sourceUrl: string;
  pdfLinks?: string[]; // PDF attachment URLs found on the source page
}

export async function extractTendersWithAI(
  text: string,
  sourceUrl: string,
  pdfLinks: string[] = [],
): Promise<BroadTenderResource[]> {
  if (!text || text.length < 50) return [];

  const pdfSection = pdfLinks.length > 0
    ? `\nPDF/document attachments found on this page:\n${pdfLinks.map(l => `- ${l}`).join('\n')}\n`
    : '';

  const prompt = `You are a specialized AI assistant that extracts government tender (procurement) opportunities from raw website text.
Source URL: ${sourceUrl}
${pdfSection}
Scraped content:
${text.substring(0, 12000)}

Rules:
- Extract any real tender, bid, or procurement postings found in the text.
- If multiple tenders are listed, extract all of them.
- Only extract open, active tenders.
- For sourceUrl: If this page is an aggregator, look for the original purchasing authority's website link or document link in the [LINK] sections and return the TRUE origin URL. If it's already the authority's site or no origin link exists, return the provided Source URL.
- If no tenders are found, return an empty array.
- For referenceNo, if none is explicitly provided, use a short slugified version of the title or generate a unique looking string from the text.
- Try to classify the category as goods, works, services, or consultancy.
- If PDF attachment links are listed above, include the most relevant one as the documentUrl in description or note it.
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
          location: z.string().nullable().describe("Raw location string if mentioned, else null"),
          budgetNumber: z.number().nullable().describe("Numeric budget if specified, else null"),
          currency: z.string().default('USD'),
          sourceUrl: z.string(),
          deadlineIsoString: z.string().nullable().describe("ISO 8601 format if found, else null"),
        }))
      }),
      prompt,
    });

    const rawTenders = object.tenders.map((tender: {
      referenceNo: string; title: string; description: string | null;
      contractingAuthority: string; category: BroadTenderResource['category'];
      location: string | null; budgetNumber: number | null; currency: string; sourceUrl: string; deadlineIsoString: string | null;
    }) => ({
      referenceNo: tender.referenceNo,
      title: tender.title,
      description: tender.description,
      contractingAuthority: tender.contractingAuthority,
      category: tender.category,
      location: tender.location,
      budget: tender.budgetNumber,
      currency: tender.currency,
      sourceUrl: tender.sourceUrl || sourceUrl,
      deadline: tender.deadlineIsoString ? new Date(tender.deadlineIsoString) : null,
      pdfLinks,
    }));

    const normalizedTenders = await Promise.all(
      rawTenders.map(async (tender: any) => {
        let regionId = null;
        if (tender.location) {
           regionId = await normalizeLocationAndGetRegionId(tender.location);
        } else if (tender.contractingAuthority) {
           regionId = await normalizeLocationAndGetRegionId(tender.contractingAuthority);
        }
        
        return {
          ...tender,
          regionId
        };
      })
    );

    return normalizedTenders;
  } catch (err) {
    console.error(`[extractTendersWithAI] Failed on ${sourceUrl}:`, (err as Error).message);
    return [];
  }
}

export async function discoverTenders(query: string, maxPages: number = 5): Promise<BroadTenderResource[]> {
  console.log(`[discoverTenders] Searching for: "${query}"...`);
  const urls = await searchGoogle(query, 20);
  console.log(`[discoverTenders] Found ${urls.length} viable URLs to scrape.`);

  const allTenders: BroadTenderResource[] = [];
  let pagesProcessed = 0;

  for (const url of urls) {
    if (pagesProcessed >= maxPages) break;

    console.log(`[discoverTenders] Scraping ${url}...`);
    const html = await fetchHtml(url);
    if (!html) continue;

    // Use trafilatura-enriched extraction (returns text + PDF links)
    const { text, pdfLinks } = await htmlToTextEnriched(html, url);
    const tenders = await extractTendersWithAI(text, url, pdfLinks);

    if (tenders.length > 0) {
      console.log(`[discoverTenders] Extracted ${tenders.length} tenders from ${url} (${pdfLinks.length} PDF links)`);
      allTenders.push(...tenders);
    }

    pagesProcessed++;
    // Polite delay between pages
    await new Promise(res => setTimeout(res, 3000));
  }

  console.log(`[discoverTenders] Finished. Total tenders discovered: ${allTenders.length}`);
  return allTenders;
}
