import { generateObjectWithFallback } from '../ai/router';
import { z } from 'zod';
import { fetchHtml, htmlToTextEnriched, fetchAndParseDocument } from './compliance-base';
import { searchGoogle } from './broad-search-engine';

export interface BroadComplianceResource {
  title: string;
  description: string;
  category: 'tax' | 'business_registration' | 'employment' | 'environment' | 'health_safety' | 'sector_specific';
  issuingAuthority: string;
  resourceType: 'form' | 'calculator' | 'guideline' | 'notice';
  sourceUrl: string;
}

export async function extractComplianceWithAI(
  text: string,
  sourceUrl: string,
  pdfLinks: string[] = [],
): Promise<BroadComplianceResource[]> {
  if (!text || text.length < 50) return [];

  // Enrich text with content from linked PDF/DOCX documents (up to 3)
  let enrichedText = text;
  for (const pdfUrl of pdfLinks.slice(0, 3)) {
    try {
      const docText = await fetchAndParseDocument(pdfUrl);
      if (docText && docText.length > 50) {
        enrichedText += `\n\n--- DOCUMENT CONTENT (${pdfUrl}) ---\n${docText.substring(0, 8000)}`;
        console.log(`[extractComplianceWithAI] Enriched with ${docText.length} chars from ${pdfUrl}`);
      }
    } catch {
      // ignore failed doc reads
    }
  }

  const prompt = `You are a specialized AI assistant that extracts business compliance, tax, and registration information from raw website text.
Source URL: ${sourceUrl}

Scraped content:
${enrichedText.substring(0, 8000)}

Rules:
- Extract up to 10 compliance requirements, official forms, guidelines, or regulatory notices found in the text.
- For 'title': The name of the compliance requirement or form (e.g. "VAT Registration", "PAYE Form").
- For 'description': A brief explanation of what it is and who needs it (2-3 sentences).
- For 'category': Must be one of: tax, business_registration, employment, environment, health_safety, sector_specific.
- For 'issuingAuthority': The government body (e.g. "KRA", "TRA", "URSB").
- For 'resourceType': Must be one of: form, calculator, guideline, notice.
- For 'sourceUrl': Look for the direct link to the authority's website, form download link, or original source in the [LINK] sections and return the TRUE origin URL. If it's already the authority's site or no origin link exists, return the provided Source URL.
- Return empty array if none found.
`;

  try {
    const { object } = await generateObjectWithFallback({
      schema: z.object({
        resources: z.array(z.object({
          title: z.string(),
          description: z.string(),
          category: z.enum(['tax', 'business_registration', 'employment', 'environment', 'health_safety', 'sector_specific']),
          issuingAuthority: z.string(),
          resourceType: z.enum(['form', 'calculator', 'guideline', 'notice']),
          sourceUrl: z.string(),
        }))
      }),
      prompt,
    });

    if (!object || !object.resources) return [];

    return object.resources.map((r: any) => ({
      title: r.title,
      description: r.description,
      category: r.category,
      issuingAuthority: r.issuingAuthority,
      resourceType: r.resourceType,
      sourceUrl: r.sourceUrl || sourceUrl,
    }));
  } catch (err) {
    console.error(`[extractComplianceWithAI] Failed on ${sourceUrl}:`, (err as Error).message);
    return [];
  }
}

export async function discoverCompliance(query: string, maxPages: number = 3): Promise<BroadComplianceResource[]> {
  console.log(`[discoverCompliance] Searching for: "${query}"...`);
  const urls = await searchGoogle(query, 10);
  console.log(`[discoverCompliance] Found ${urls.length} viable URLs to scrape.`);

  const allResources: BroadComplianceResource[] = [];
  let pagesProcessed = 0;

  for (const url of urls) {
    if (pagesProcessed >= maxPages) break;

    console.log(`[discoverCompliance] Scraping ${url}...`);
    const html = await fetchHtml(url);
    if (!html) continue;

    const { text, pdfLinks } = await htmlToTextEnriched(html, url);
    const resources = await extractComplianceWithAI(text, url, pdfLinks);

    if (resources.length > 0) {
      console.log(`[discoverCompliance] Extracted ${resources.length} resources from ${url}`);
      allResources.push(...resources);
    }

    pagesProcessed++;
    await new Promise(res => setTimeout(res, 2000));
  }

  console.log(`[discoverCompliance] Finished. Total resources discovered: ${allResources.length}`);
  return allResources;
}
