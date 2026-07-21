import { generateObjectWithFallback } from '../ai/router';
import { z } from 'zod';
import { fetchHtml, htmlToTextEnriched } from './compliance-base';
import { searchGoogle } from './broad-search-engine';

export interface BroadComplianceResource {
  title: string;
  description: string;
  category: 'tax' | 'business_registration' | 'employment' | 'environment' | 'health_safety' | 'sector_specific';
  issuingAuthority: string;
  resourceType: 'form' | 'calculator' | 'guideline' | 'notice';
  sourceUrl: string;
}

export async function extractComplianceWithAI(text: string, sourceUrl: string): Promise<BroadComplianceResource[]> {
  if (!text || text.length < 50) return [];

  const prompt = `You are a specialized AI assistant that extracts business compliance, tax, and registration information from raw website text.
Source URL: ${sourceUrl}

Scraped content:
${text.substring(0, 12000)}

Rules:
- Extract any compliance requirements, official forms, guidelines, or regulatory notices found in the text. Be comprehensive.
- For 'title': The name of the compliance requirement or form (e.g. "VAT Registration", "PAYE Form").
- For 'description': A brief explanation of what it is and who needs it.
- For 'category': Must be one of: tax, business_registration, employment, environment, health_safety, sector_specific.
- For 'issuingAuthority': The government body (e.g. "KRA", "TRA", "URSB").
- For 'resourceType': Must be one of: form, calculator, guideline, notice.
- Extract all compliance resources found. Return empty array if none found.
`;

  try {
    const { object } = await generateObjectWithFallback({
      schema: z.object({
        resources: z.array(z.object({
          title: z.string().min(3),
          description: z.string(),
          category: z.enum(['tax', 'business_registration', 'employment', 'environment', 'health_safety', 'sector_specific']),
          issuingAuthority: z.string(),
          resourceType: z.enum(['form', 'calculator', 'guideline', 'notice']),
        }))
      }),
      prompt,
    });

    return object.resources.map((r: any) => ({
      title: r.title,
      description: r.description,
      category: r.category,
      issuingAuthority: r.issuingAuthority,
      resourceType: r.resourceType,
      sourceUrl,
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

    const { text } = await htmlToTextEnriched(html, url);
    const resources = await extractComplianceWithAI(text, url);

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
