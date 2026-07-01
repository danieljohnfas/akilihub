import { Strategy } from './engine';

export interface ScraperInput {
  url: string;
  portalType: 'ppra_tz' | 'ppoa_ke' | 'ppda_ug';
}

export interface TenderResult {
  title: string;
  referenceNo: string;
  contractingAuthority: string;
  deadline: string;
  sourceUrl: string;
}

// 1. Visual Scraper (Maxun)
export class MaxunStrategy implements Strategy<ScraperInput, TenderResult[]> {
  name = 'Maxun (Visual API)';
  
  async execute(input: ScraperInput): Promise<TenderResult[]> {
    // Attempt to hit the local Maxun Docker API
    // Placeholder implementation
    const response = await fetch('http://localhost:8080/api/run-robot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotId: input.portalType, url: input.url })
    });
    
    if (!response.ok) {
      throw new Error(`Maxun API failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.tenders as TenderResult[];
  }
}

// 2. LLM Extraction (Crawl4AI)
export class Crawl4AiStrategy implements Strategy<ScraperInput, TenderResult[]> {
  name = 'Crawl4AI (LLM Extraction)';
  
  async execute(input: ScraperInput): Promise<TenderResult[]> {
    // Attempt to hit the local Crawl4AI Python wrapper
    const response = await fetch('http://localhost:8000/crawl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: input.url, schema: "TenderResult[]" })
    });
    
    if (!response.ok) {
      throw new Error(`Crawl4AI API failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.tenders as TenderResult[];
  }
}

// 3. Traditional HTML Parsing (Crawlee / Cheerio)
export class CrawleeStrategy implements Strategy<ScraperInput, TenderResult[]> {
  name = 'Crawlee (Cheerio Traditional)';
  
  async execute(input: ScraperInput): Promise<TenderResult[]> {
    // Use Crawlee here. For demonstration, we'll return a mock or throw if it fails.
    // In a real app, this would instantiate a CheerioCrawler.
    console.log(`[CrawleeStrategy] Scraping ${input.url} via traditional DOM parsing...`);
    
    // Simulating traditional scraper logic
    return [
      {
        title: 'Provision of Office Supplies',
        referenceNo: 'TENDER/2025/001',
        contractingAuthority: 'Ministry of Health',
        deadline: new Date().toISOString(),
        sourceUrl: input.url
      }
    ];
  }
}
