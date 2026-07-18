import * as cheerio from 'cheerio';
import { generateObjectWithFallback } from '../ai/router';
import { z } from 'zod';

export interface ComplianceResource {
  title: string;
  description: string;
  resourceType: 'form' | 'calculator' | 'guideline' | 'notice';
  sourceUrl: string;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'AkiliBrain/1.0 (compliance-scraper)',
];

/**
 * Fetches HTML from a URL.
 * First tries the Scrapling Python Sidecar (to bypass Cloudflare and JS-render).
 * If the sidecar is unreachable or fails, falls back to plain HTTP with multiple user-agents.
 */
export async function fetchHtml(url: string): Promise<string | null> {
  const sidecarUrl = process.env.SCRAPLING_URL ?? 'http://localhost:8001';
  
  // 1. Try Scrapling Sidecar
  try {
    const res = await fetch(`${sidecarUrl}/fetch_html`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, use_stealth: true }),
      signal: AbortSignal.timeout(45_000), // Give it time to launch Chrome
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.html && data.html.length > 500) {
        console.log(`[fetchHtml:Sidecar] Got ${data.html.length} bytes from ${url}`);
        return data.html;
      } else if (!data.robots_allowed) {
        console.warn(`[fetchHtml:Sidecar] robots.txt disallows scraping: ${url}`);
        return null;
      }
    }
  } catch (err) {
    console.warn(`[fetchHtml:Sidecar] Sidecar failed or unreachable, falling back to plain HTTP. Error:`, (err as Error).message);
  }

  // 2. Fallback to plain HTTP if Sidecar fails
  for (const ua of USER_AGENTS) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        console.log(`[fetchHtml:Fallback] ${url} returned ${res.status} with UA ${ua}`);
        continue;
      }

      const html = await res.text();
      if (html && html.length > 500) {
        console.log(`[fetchHtml:Fallback] Got ${html.length} bytes from ${url}`);
        return html;
      }
    } catch (err) {
      console.log(`[fetchHtml:Fallback] Failed with UA "${ua}":`, (err as Error).message);
    }
  }
  
  return null;
}

/**
 * Converts HTML to a condensed text representation suitable for AI extraction.
 * Removes scripts/styles and extracts meaningful link+text content.
 */
export function htmlToText(html: string, baseUrl: string): string {
  const $ = cheerio.load(html);

  // Remove noise
  $('script, style, noscript, nav, footer, header').remove();

  const lines: string[] = [];

  // Extract all links with their text — key for finding downloadable forms/resources
  $('a[href]').each((_i, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr('href') ?? '';
    if (!text || text.length < 3) return;

    let fullUrl = href;
    if (href.startsWith('/')) {
      try {
        const base = new URL(baseUrl);
        fullUrl = `${base.origin}${href}`;
      } catch {}
    } else if (!href.startsWith('http')) {
      try {
        fullUrl = new URL(href, baseUrl).toString();
      } catch {}
    }

    lines.push(`[LINK] ${text} => ${fullUrl}`);
  });

  // Also extract visible text paragraphs
  $('p, li, td, th, h1, h2, h3, h4').each((_i, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length > 10) lines.push(text);
  });

  return lines.slice(0, 300).join('\n');
}

/**
 * Uses Gemini AI to extract structured compliance resources from scraped text.
 */
export async function extractResourcesWithAI(
  text: string,
  authorityName: string,
  baseUrl: string,
  prompt: string,
): Promise<ComplianceResource[]> {
  if (!text || text.length < 50) {
    console.log(`[extractResourcesWithAI] Text too short, skipping AI extraction`);
    return [];
  }

  const fullPrompt = `${prompt}

Authority: ${authorityName}
Base URL: ${baseUrl}

Scraped content (links and text):
${text.substring(0, 12000)}

Rules:
- Only extract real, specific resources (forms, calculators, guidelines, notices). 
- Do NOT invent URLs — use the [LINK] entries above directly.
- If a resource has no direct URL, use the base URL: ${baseUrl}
- Return an empty array if no real resources are found.`;

  const { object } = await generateObjectWithFallback({
    schema: z.object({
      resources: z.array(z.object({
        title: z.string().min(3),
        description: z.string(),
        resourceType: z.enum(['form', 'calculator', 'guideline', 'notice']),
        sourceUrl: z.string(),
      }))
    }),
    prompt: fullPrompt,
  });

  console.log(`[extractResourcesWithAI] AI extracted ${object.resources.length} resources`);
  return object.resources;
}
