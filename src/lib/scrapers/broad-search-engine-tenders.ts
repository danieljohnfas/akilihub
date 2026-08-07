import { generateObjectWithFallback } from '../ai/router';
import { normalizeLocationAndGetRegionId } from '../ai/location';
import { z } from 'zod';
import { fetchHtml, htmlToTextEnriched } from './compliance-base';
import { searchGoogle, SCRAPING_GUIDELINES } from './broad-search-engine';
import { extractDeterministicTenderFields } from './deterministic-extractor';

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
    ? `\nPDF/document attachments found on this page:\n${pdfLinks.slice(0, 8).map(l => `- ${l}`).join('\n')}\n`
    : '';

  const prompt = `You are a specialized AI assistant that extracts government tender (procurement) opportunities from raw website text.
Source URL: ${sourceUrl}
${pdfSection}
${SCRAPING_GUIDELINES}

Scraped content:
${text.substring(0, 12000)}

TENDER-SPECIFIC EXTRACTION RULES:
- Extract up to 15 real tender, bid, or procurement postings found in the text. Extract ALL visible, not just the first.
- Only extract open, active tenders. Skip anything marked closed, awarded, or cancelled.
- For 'description': Provide a FULL scope of work including: what goods/services are required, the
  procurement objective, any technical specifications mentioned, and eligibility criteria (3-5 sentences).
- For 'contractingAuthority': The exact name of the procuring entity (ministry, agency, NGO, UN body).
- For 'sourceUrl': If this page is an aggregator, look for the original purchasing authority's website
  link or tender document link in the [LINK] sections and return the TRUE origin URL.
- For 'referenceNo': Use the official tender/bid reference number. If none is explicitly provided,
  generate a short slug from the title (e.g. "SUPPLY-MEDICAL-KE-001").
- For 'category': Classify as goods, works, services, or consultancy using the full description.
- For 'deadlineIsoString': Closing/submission date in ISO 8601 format. Look for: "deadline",
  "closing date", "submission date", "date limite de soumission", "tarehe ya kufunga".
- For 'budgetNumber': Contract value or estimated budget as a plain number. Null if not stated.
- If PDF attachment links are listed above, include the most relevant document link in description.
- Return empty array if no active tenders are found.
`;

  // Fast-path deterministic pre-extraction
  const deterministic = extractDeterministicTenderFields(text, sourceUrl);

  try {
    const { object } = await generateObjectWithFallback({
      schema: z.object({
        tenders: z.array(z.object({
          referenceNo: z.string(),
          title: z.string(),
          description: z.string().nullable(),
          contractingAuthority: z.string(),
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
    }, idx: number) => {
      const resolvedRef = (tender.referenceNo && tender.referenceNo.trim() && tender.referenceNo.toLowerCase() !== 'n/a')
        ? tender.referenceNo
        : (deterministic.referenceNo || `TND-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}-${idx + 1}`);

      const refSlug = resolvedRef.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40).replace(/^-|-$/g, '');
      const hasSpecificUrl = tender.sourceUrl && tender.sourceUrl.startsWith('http') && tender.sourceUrl !== sourceUrl;
      const uniqueSourceUrl = hasSpecificUrl ? tender.sourceUrl : `${sourceUrl}#${refSlug}-${idx + 1}`;

      let deadline = tender.deadlineIsoString ? new Date(tender.deadlineIsoString) : null;
      if (!deadline && deterministic.deadline) {
        deadline = deterministic.deadline;
      }

      const budget = tender.budgetNumber ?? deterministic.budget;
      const currency = tender.currency || deterministic.currency || 'USD';

      return {
        referenceNo: resolvedRef,
        title: tender.title,
        description: tender.description || deterministic.description,
        contractingAuthority: tender.contractingAuthority,
        category: tender.category || deterministic.category,
        location: tender.location,
        budget,
        currency,
        sourceUrl: uniqueSourceUrl,
        deadline,
        pdfLinks,
      };
    });

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
    console.warn(`[extractTendersWithAI] AI extraction unavailable on ${sourceUrl} (${(err as Error).message}). Engaging deterministic fallback.`);

    // Graceful Fallback: Build structured tender from deterministic extraction + raw text
    if (text.length >= 100 && (deterministic.referenceNo || deterministic.deadline || /tender|procurement|bid|rfp|rfq|expression of interest|ifb|soumission|marche public/i.test(text))) {
      const titleMatch = /^(?:Tender\s*(?:Title|Name|Notice)?[:\s]*)?([^\n\r]{5,90})/m.exec(text);
      const inferredTitle = titleMatch ? titleMatch[1].trim().replace(/^[#*-\s]+/, '') : 'Procurement Opportunity';
      const refNo = deterministic.referenceNo || `TND-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

      return [{
        referenceNo: refNo,
        title: inferredTitle,
        description: deterministic.description,
        contractingAuthority: 'Procuring Entity',
        category: deterministic.category,
        regionId: null,
        budget: deterministic.budget,
        currency: deterministic.currency,
        deadline: deterministic.deadline,
        sourceUrl,
        pdfLinks,
      }];
    }

    return [];
  }
}

export async function discoverTenders(query: string, maxPages: number = 5): Promise<BroadTenderResource[]> {
  console.log(`[discoverTenders] Searching for: "${query}"...`);
  const urls = await searchGoogle(query, 25);
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
