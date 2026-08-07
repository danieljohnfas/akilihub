import { generateObjectWithFallback } from '../ai/router';
import { z } from 'zod';
import { fetchHtml, htmlToTextEnriched, fetchAndParseDocument } from './compliance-base';
import { searchGoogle, SCRAPING_GUIDELINES } from './broad-search-engine';

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

${SCRAPING_GUIDELINES}

Scraped content:
${enrichedText.substring(0, 12000)}

COMPLIANCE-SPECIFIC EXTRACTION RULES:
- Extract up to 10 compliance requirements, official forms, guidelines, or regulatory notices.
  Extract ALL compliance items visible, not just the most prominent.
- For 'title': The exact name of the compliance requirement or form (e.g. "VAT Registration",
  "PAYE Form P10", "Formulaire CNSS"). Keep in original language.
- For 'description': A FULL explanation (3-4 sentences) covering: what it is, who must comply,
  the filing/submission deadline or frequency, penalties for non-compliance if stated, and any
  fees involved. This should be comprehensive enough for a business owner to understand their obligation.
- For 'category': Must be one of: tax, business_registration, employment, environment,
  health_safety, sector_specific.
- For 'issuingAuthority': The exact government body or agency (e.g. "KRA", "TRA", "URSB",
  "RDB", "OBR", "DGI"). Do not abbreviate unknown agencies — spell out the full name.
- For 'resourceType': Must be one of: form, calculator, guideline, notice.
- For 'sourceUrl': Look for the direct link to the authority's website, form download link,
  or original source in the [LINK] sections and return the TRUE origin URL.
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
    console.warn(`[extractComplianceWithAI] AI extraction unavailable on ${sourceUrl} (${(err as Error).message}). Engaging deterministic fallback.`);

    // Graceful Fallback: Extract compliance guidelines / notices from document text
    if (enrichedText.length >= 100 && /tax|vat|paye|registration|compliance|regulation|license|permit|customs|authority|statutory/i.test(enrichedText)) {
      const titleMatch = /^(?:Guideline|Regulation|Form|Notice|Requirement)?[:\s]*([^\n\r]{5,80})/m.exec(enrichedText);
      const inferredTitle = titleMatch ? titleMatch[1].trim().replace(/^[#*-\s]+/, '') : 'Regulatory & Compliance Guideline';

      const paragraphs = enrichedText
        .split(/\n{2,}/)
        .map(p => p.trim())
        .filter(p => p.length >= 60 && !p.startsWith('http') && !p.includes('©'));
      const description = paragraphs.slice(0, 3).join('\n\n') || enrichedText.slice(0, 500);

      let category: BroadComplianceResource['category'] = 'business_registration';
      const lower = enrichedText.toLowerCase();
      if (lower.includes('tax') || lower.includes('vat') || lower.includes('paye') || lower.includes('income tax')) {
        category = 'tax';
      } else if (lower.includes('employment') || lower.includes('labor') || lower.includes('labour') || lower.includes('nssf')) {
        category = 'employment';
      } else if (lower.includes('environment') || lower.includes('nema')) {
        category = 'environment';
      } else if (lower.includes('health') || lower.includes('safety') || lower.includes('osha')) {
        category = 'health_safety';
      }

      return [{
        title: inferredTitle,
        description,
        category,
        issuingAuthority: 'Regulatory Authority',
        resourceType: 'guideline',
        sourceUrl,
      }];
    }

    return [];
  }
}

export async function discoverCompliance(query: string, maxPages: number = 3): Promise<BroadComplianceResource[]> {
  console.log(`[discoverCompliance] Searching for: "${query}"...`);
  const urls = await searchGoogle(query, 20);
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
