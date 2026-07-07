import { Strategy } from './engine';
import * as cheerio from 'cheerio';

export type PortalType =
  | 'ppra_tz'
  | 'ppoa_ke'
  | 'ppda_ug'
  | 'brela_tz'
  | 'rppa_rw'
  | 'pppa_et'
  | 'armp_cd'
  | 'tra_tz_resources'
  | 'kra_ke_resources'
  | 'brela_tz_resources';

export interface ScraperInput {
  url: string;
  portalType: PortalType;
  searchQuery?: string;
}

export interface TenderResult {
  title: string;
  referenceNo: string;
  contractingAuthority: string;
  deadline: string;
  sourceUrl: string;
  description?: string;
  publishedDate?: string;
}

// Per-portal CSS selectors — tuned per government procurement site structure
const PORTAL_SELECTORS: Record<string, {
  row: string;
  ref: string;
  title: string;
  authority: string;
  deadline?: string;
  published?: string;
}> = {
  ppra_tz: {
    row: 'table tr:not(:first-child)',
    ref: 'td:nth-child(1)',
    title: 'td:nth-child(2)',
    authority: 'td:nth-child(3)',
    deadline: 'td:nth-child(5)',
    published: 'td:nth-child(4)',
  },
  ppoa_ke: {
    row: '.tender-list tr:not(:first-child), table.tenders tr:not(:first-child), table tr:not(:first-child)',
    ref: 'td:nth-child(1)',
    title: 'td:nth-child(2)',
    authority: 'td:nth-child(3)',
    deadline: 'td:nth-child(4)',
  },
  ppda_ug: {
    row: '.views-table tr:not(:first-child), table tr:not(:first-child)',
    ref: 'td:nth-child(1)',
    title: 'td:nth-child(2)',
    authority: 'td:nth-child(3)',
    deadline: 'td:nth-child(4)',
  },
  brela_tz: {
    row: '.search-result, .company-row, table tr:not(:first-child)',
    ref: 'td:nth-child(1)',
    title: 'td:nth-child(2)',
    authority: 'td:nth-child(3)',
    deadline: 'td:nth-child(4)',
  },
  rppa_rw: {
    row: '.tender-item, table tr:not(:first-child)',
    ref: 'td:nth-child(1)',
    title: 'td:nth-child(2)',
    authority: 'td:nth-child(3)',
    deadline: 'td:nth-child(4)',
  },
  pppa_et: {
    row: '.bid-item, table tr:not(:first-child)',
    ref: 'td:nth-child(1)',
    title: 'td:nth-child(2)',
    authority: 'td:nth-child(3)',
    deadline: 'td:nth-child(4)',
  },
  armp_cd: {
    row: '.appel-item, article.appel, table tr:not(:first-child)',
    ref: 'td:nth-child(1)',
    title: 'td:nth-child(2), h3, .title',
    authority: 'td:nth-child(3), .entity',
    deadline: 'td:nth-child(4), .date',
  },
};

// Shared Cheerio extraction logic — reused by both Firecrawl and Crawlee strategies
function extractFromHtml(html: string, portalType: string, sourceUrl: string): TenderResult[] {
  const $ = cheerio.load(html);
  const results: TenderResult[] = [];
  const selectors = PORTAL_SELECTORS[portalType] ?? PORTAL_SELECTORS['ppoa_ke'];

  // ── Portal-specific structured selectors ──
  $(selectors.row).each((_i, el) => {
    const refRaw   = $(el).find(selectors.ref).first().text().trim();
    const titleRaw = $(el).find(selectors.title).first().text().trim();
    const authRaw  = $(el).find(selectors.authority).first().text().trim();
    const dlRaw    = selectors.deadline ? $(el).find(selectors.deadline).first().text().trim() : '';
    const pubRaw   = selectors.published ? $(el).find(selectors.published).first().text().trim() : '';

    if (!titleRaw || titleRaw.length < 5) return;

    results.push({
      referenceNo: refRaw || `${portalType.toUpperCase()}-${Date.now()}-${results.length}`,
      title: titleRaw,
      contractingAuthority: authRaw || 'Government Authority',
      deadline: dlRaw || new Date(Date.now() + 86400000 * 30).toISOString(),
      publishedDate: pubRaw || new Date().toISOString(),
      sourceUrl,
    });
  });

  // ── Generic heuristic fallback ──
  if (results.length === 0) {
    $('tr').each((_i, el) => {
      const rowText = $(el).text().trim();
      if (
        rowText.length > 20 &&
        (rowText.toLowerCase().includes('tender') ||
         rowText.toLowerCase().includes('procurement') ||
         rowText.toLowerCase().includes('appel') ||
         rowText.toLowerCase().includes('offre') ||
         rowText.toLowerCase().includes('bid'))
      ) {
        const cells = $(el).find('td');
        if (cells.length >= 2) {
          results.push({
            referenceNo: $(cells[0]).text().trim() || `GPN-${Date.now()}-${results.length}`,
            title: $(cells[1]).text().trim() || rowText.slice(0, 120),
            contractingAuthority: cells.length >= 3 ? $(cells[2]).text().trim() : 'Government Authority',
            deadline: new Date(Date.now() + 86400000 * 30).toISOString(),
            sourceUrl,
          });
        }
      }
    });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGY 1: Firecrawl — cloud headless browser, handles JS + anti-bot
// Works perfectly on Vercel. Uses FIRECRAWL_API_KEY env var.
// ─────────────────────────────────────────────────────────────────────────────
import FirecrawlApp from '@mendable/firecrawl-js';

export class FirecrawlStrategy implements Strategy<ScraperInput, TenderResult[]> {
  name = 'Firecrawl (Cloud Headless)';

  async execute(input: ScraperInput): Promise<TenderResult[]> {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) throw new Error('FIRECRAWL_API_KEY is not set.');
    
    const apiUrl = process.env.FIRECRAWL_API_URL || 'http://localhost:3002';

    console.log(`[FirecrawlStrategy] Scraping ${input.url} via ${apiUrl}...`);

    const app = new FirecrawlApp({ apiKey, apiUrl });

    const result = await app.scrapeUrl(input.url, {
      formats: ['html'],
      waitFor: 3000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    } as any) as any;

    if (!result.success || !result.html) {
      throw new Error(`Firecrawl returned no HTML for ${input.url}`);
    }

    const tenders = extractFromHtml(result.html, input.portalType, input.url);
    console.log(`[FirecrawlStrategy] Extracted ${tenders.length} results from ${input.url}`);
    return tenders;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGY 2: Maxun — local Docker only, fails fast (5s) in production
// ─────────────────────────────────────────────────────────────────────────────
export class MaxunStrategy implements Strategy<ScraperInput, TenderResult[]> {
  name = 'Maxun (Visual API)';

  async execute(input: ScraperInput): Promise<TenderResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch('http://localhost:8080/api/run-robot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ robotId: input.portalType, url: input.url }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Maxun API failed: ${response.status}`);
      const data = await response.json();
      return data.tenders as TenderResult[];
    } finally {
      clearTimeout(timeout);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGY 3: Crawl4AI — local Python only, fails fast (5s) in production
// ─────────────────────────────────────────────────────────────────────────────
export class Crawl4AiStrategy implements Strategy<ScraperInput, TenderResult[]> {
  name = 'Crawl4AI (LLM Extraction)';

  async execute(input: ScraperInput): Promise<TenderResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch('http://localhost:8000/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input.url, schema: 'TenderResult[]' }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Crawl4AI API failed: ${response.status}`);
      const data = await response.json();
      return data.tenders as TenderResult[];
    } finally {
      clearTimeout(timeout);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGY 4: Crawlee/Cheerio — pure HTTP fallback, no JS rendering
// Works on Vercel but won't parse JS-rendered portals
// ─────────────────────────────────────────────────────────────────────────────
import { CheerioCrawler, RequestList } from '@crawlee/cheerio';

export class CrawleeStrategy implements Strategy<ScraperInput, TenderResult[]> {
  name = 'Crawlee (Cheerio Fallback)';

  async execute(input: ScraperInput): Promise<TenderResult[]> {
    console.log(`[CrawleeStrategy] Scraping ${input.url} (no JS rendering)...`);
    let results: TenderResult[] = [];

    const requestList = await RequestList.open(null, [input.url]);

    const crawler = new CheerioCrawler({
      requestList,
      maxRequestRetries: 2,
      requestHandlerTimeoutSecs: 45,
      navigationTimeoutSecs: 30,

      async requestHandler({ $, request }) {
        const html = $.html();
        results = extractFromHtml(html, input.portalType, request.url);
      },

      failedRequestHandler({ request, log }) {
        log.error(`Failed to scrape ${request.url} after retries.`);
      },
    });

    await crawler.run();
    return results;
  }
}
