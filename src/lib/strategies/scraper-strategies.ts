import { Strategy } from './engine';
import * as cheerio from 'cheerio';

// ── Single source-of-truth selectors (shared with Python sidecar) ─────────────
// Both this file and scraper/css_selectors.py load from the same JSON.
// Update scraper/selectors.json when a portal redesigns — never edit selectors here directly.
import SELECTORS_JSON from '../../../scraper/selectors.json';

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

// Build typed selector map from JSON
type SelectorMap = { row: string; ref: string; title: string; authority: string; deadline?: string; published?: string };
const PORTAL_SELECTORS: Record<string, SelectorMap> = SELECTORS_JSON as Record<string, SelectorMap>;
const FALLBACK_SELECTORS: SelectorMap = SELECTORS_JSON._fallback as SelectorMap;

// Shared Cheerio extraction logic — reused by both Firecrawl and Crawlee strategies
function extractFromHtml(html: string, portalType: string, sourceUrl: string): TenderResult[] {
  const $ = cheerio.load(html);
  const results: TenderResult[] = [];
  const selectors = PORTAL_SELECTORS[portalType] ?? FALLBACK_SELECTORS;

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
// STRATEGY 1: Scrapling — Python sidecar with StealthyFetcher + camoufox fallback
// Cloudflare bypass + adaptive CSS selectors + pause/resume for large crawls.
// Runs on port 8001. Times out after 60s to give Chromium time to start.
// ─────────────────────────────────────────────────────────────────────────────
export class ScraplingStrategy implements Strategy<ScraperInput, TenderResult[]> {
  name = 'Scrapling (Stealth Python Sidecar)';

  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.SCRAPLING_URL ?? 'http://localhost:8001';
  }

  async execute(input: ScraperInput): Promise<TenderResult[]> {
    const controller = new AbortController();
    // 60s — StealthyFetcher needs time to launch Chromium + solve Cloudflare.
    // camoufox fallback (Firefox) adds extra time.
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      console.log(`[ScraplingStrategy] Calling sidecar for ${input.url} (portal: ${input.portalType})`);

      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: input.url,
          portal_type: input.portalType,
          use_stealth: true,
          max_pages: 1,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Scrapling sidecar error ${response.status}: ${text.slice(0, 200)}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`Scrapling reported failure: ${data.error ?? 'unknown'}`);
      }

      if (!data.robots_allowed) {
        console.warn(`[ScraplingStrategy] robots.txt disallows ${input.url} — 0 results returned.`);
        return [];
      }

      console.log(`[ScraplingStrategy] Strategy: ${data.strategy_used ?? 'scrapling'}, count: ${data.count}`);

      // Map Python snake_case → TypeScript camelCase TenderResult
      return (data.tenders ?? []).map((t: {
        title: string; reference_no: string; contracting_authority: string;
        deadline: string; source_url: string; description?: string; published_date?: string;
      }) => ({
        title: t.title,
        referenceNo: t.reference_no,
        contractingAuthority: t.contracting_authority,
        deadline: t.deadline,
        sourceUrl: t.source_url,
        description: t.description ?? undefined,
        publishedDate: t.published_date ?? undefined,
      })) as TenderResult[];
    } finally {
      clearTimeout(timeout);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGY 2: Firecrawl — cloud headless browser, handles JS + anti-bot
// Works on Vercel. Uses FIRECRAWL_API_KEY env var (or self-hosted FIRECRAWL_API_URL).
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
// STRATEGY 3: Crawlee/Playwright — stealth JS browser, free, runs locally
// Upgraded from CheerioCrawler (plain HTTP, no JS) to PlaywrightCrawler.
// Crawlee has built-in fingerprint generation so no extra stealth plugin needed.
// ─────────────────────────────────────────────────────────────────────────────
export class CrawleeStrategy implements Strategy<ScraperInput, TenderResult[]> {
  name = 'Crawlee (Playwright Stealth)';

  async execute(input: ScraperInput): Promise<TenderResult[]> {
    console.log(`[CrawleeStrategy] Scraping ${input.url} with Playwright stealth...`);
    let results: TenderResult[] = [];

    try {
      // Dynamic import — Playwright only on environments that have it installed
      const { PlaywrightCrawler } = await import('@crawlee/playwright');

      const crawler = new PlaywrightCrawler({
        maxRequestsPerCrawl: 1,
        requestHandlerTimeoutSecs: 60,
        navigationTimeoutSecs: 45,
        // Crawlee's built-in browser fingerprint rotation — no extra stealth plugin needed
        browserPoolOptions: {
          fingerprintOptions: {
            fingerprintGeneratorOptions: {
              browsers: ['chrome'],
              operatingSystems: ['windows', 'linux', 'macos'],
            },
          },
        },

        async requestHandler({ page, request, log }) {
          log.info(`CrawleeStrategy: scraping ${request.url}`);
          // Wait for the main content to render
          await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
          const html = await page.content();
          results = extractFromHtml(html, input.portalType, request.url);
          log.info(`CrawleeStrategy: extracted ${results.length} tenders`);
        },

        failedRequestHandler({ request, log }) {
          log.error(`CrawleeStrategy: failed to scrape ${request.url} after retries.`);
        },
      });

      await crawler.run([input.url]);
    } catch (importErr) {
      // @crawlee/playwright may not be installed — fall back to CheerioCrawler
      console.warn(`[CrawleeStrategy] PlaywrightCrawler unavailable, falling back to CheerioCrawler:`, (importErr as Error).message);
      const { CheerioCrawler, RequestList } = await import('@crawlee/cheerio');

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
    }

    return results;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGY 4: Crawl4AI — via Python sidecar /crawl4ai endpoint
// Uses CSS extraction strategy (no LLM cost, structured JSON output).
// Fixed: was hitting localhost:8000 with 5s timeout (always failed in prod).
// Now calls the sidecar's /crawl4ai endpoint with 45s timeout.
// ─────────────────────────────────────────────────────────────────────────────
export class Crawl4AiStrategy implements Strategy<ScraperInput, TenderResult[]> {
  name = 'Crawl4AI (CSS Extraction via Sidecar)';

  async execute(input: ScraperInput): Promise<TenderResult[]> {
    const sidecarUrl = process.env.SCRAPLING_URL ?? 'http://localhost:8001';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    try {
      console.log(`[Crawl4AiStrategy] Calling sidecar /crawl4ai for ${input.url}`);

      const response = await fetch(`${sidecarUrl}/crawl4ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: input.url,
          portal_type: input.portalType,
          use_browser: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Crawl4AI sidecar error ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(`Crawl4AI reported failure: ${data.error ?? 'unknown'}`);

      console.log(`[Crawl4AiStrategy] Extracted ${data.count} tenders from ${input.url}`);

      return (data.tenders ?? []).map((t: {
        title: string; reference_no: string; contracting_authority: string;
        deadline: string; source_url: string; description?: string;
      }) => ({
        title: t.title,
        referenceNo: t.reference_no,
        contractingAuthority: t.contracting_authority,
        deadline: t.deadline,
        sourceUrl: t.source_url,
        description: t.description ?? undefined,
      })) as TenderResult[];
    } finally {
      clearTimeout(timeout);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGY 5: Maxun — local Docker only, fails fast (5s) in production
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
