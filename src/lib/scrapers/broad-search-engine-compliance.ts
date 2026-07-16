import { generateObjectWithFallback } from '../ai/router';
import { z } from 'zod';
import { fetchHtml, htmlToText } from './compliance-base';
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

  const prompt = `You are a specialized AI assistant that extracts compliance requirements, tax forms, business registration guidelines, and regulatory notices from raw website text.
Source URL: ${sourceUrl}

Scraped content:
${text.substring(0, 12000)}

Rules:
- Extract any real compliance resources, forms, guidelines, or notices found in the text.
- If multiple resources are listed, extract all of them.
- Only extract actionable regulatory/compliance information.
- Ensure the source URL is correct (use the provided Source URL unless a specific direct link to a PDF or form is found).
- If no compliance resources are found, return an empty array.
- Try to classify the category as tax, business_registration, employment, environment, health_safety, or sector_specific.
- Try to classify the resource type as form, calculator, guideline, or notice.
`;

  try {
    const { object } = await generateObjectWithFallback({
      schema: z.object({
        resources: z.array(z.object({
          title: z.string().min(5),
          description: z.string().min(10),
          issuingAuthority: z.string().min(2),
          category: z.enum(['tax', 'business_registration', 'employment', 'environment', 'health_safety', 'sector_specific']),
          resourceType: z.enum(['form', 'calculator', 'guideline', 'notice']),
          sourceUrl: z.string().url(),
        }))
      }),
      prompt,
    });

    return object.resources.map((res: { title: string; description: string; issuingAuthority: string; category: BroadComplianceResource['category']; resourceType: BroadComplianceResource['resourceType']; sourceUrl: string }) => ({
      title: res.title,
      description: res.description,
      issuingAuthority: res.issuingAuthority,
      category: res.category,
      resourceType: res.resourceType,
      sourceUrl: res.sourceUrl,
    }));
  } catch (err) {
    console.error(`[extractComplianceWithAI] Failed on ${sourceUrl}:`, (err as Error).message);
    return [];
  }
}

export async function discoverCompliance(query: string, maxPages: number = 100): Promise<BroadComplianceResource[]> {
  console.log(`[discoverCompliance] Searching for: "${query}"...`);
  const urls = await searchGoogle(query, 100);
  console.log(`[discoverCompliance] Found ${urls.length} viable URLs to scrape.`);

  const allResources: BroadComplianceResource[] = [];
  let pagesProcessed = 0;

  for (const url of urls) {
    if (pagesProcessed >= maxPages) break;
    
    console.log(`[discoverCompliance] Scraping ${url}...`);
    const html = await fetchHtml(url);
    if (!html) continue;

    const text = htmlToText(html, url);
    const resources = await extractComplianceWithAI(text, url);
    
    if (resources.length > 0) {
      console.log(`[discoverCompliance] Extracted ${resources.length} resources from ${url}`);
      allResources.push(...resources);
    }
    
    pagesProcessed++;
    // Polite delay: 4s between pages
    await new Promise(res => setTimeout(res, 4000));
  }

  console.log(`[discoverCompliance] Finished. Total compliance resources discovered: ${allResources.length}`);
  return allResources;
}
