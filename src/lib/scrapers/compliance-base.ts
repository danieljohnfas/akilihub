import * as cheerio from 'cheerio';
import { generateObjectWithFallback } from '../ai/router';
import { z } from 'zod';
import { downloadDocument, parsePdf } from './pdf-extract';

export interface ComplianceResource {
  title: string;
  description: string;
  resourceType: 'form' | 'calculator' | 'guideline' | 'notice';
  sourceUrl: string;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  // Note: do NOT add Googlebot here — impersonating Googlebot violates most sites' ToS
];

// ── Exponential backoff helper ─────────────────────────────────────────────────
async function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2,
  baseDelayMs = 300,
): Promise<Response | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status === 401 || res.status === 403 || res.status === 404 || res.status === 410) {
        return null; // Don't retry unrecoverable HTTP status codes
      }
    } catch {
      // network/timeout error, proceed to retry
    }
    if (attempt < maxRetries - 1) {
      await sleep(baseDelayMs * Math.pow(2, attempt));
    }
  }
  return null;
}

// ── Sidecar text extraction (trafilatura) ──────────────────────────────────────
async function extractTextViaSidecar(
  url: string,
  html?: string,
): Promise<{ text: string; pdfLinks: string[] } | null> {
  const sidecarUrl = process.env.SCRAPLING_URL ?? 'http://localhost:8001';

  try {
    const body: Record<string, unknown> = { include_tables: true, include_links: true, max_chars: 15000 };
    if (html) {
      body.html = html;
      body.url = url;
    } else {
      body.url = url;
    }

    const res = await fetch(`${sidecarUrl}/extract_text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.text && data.text.length > 50) {
      return { text: data.text as string, pdfLinks: (data.pdf_links as string[]) ?? [] };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches HTML from a URL.
 * Priority:
 *   1. Plain HTTP with rotating desktop user-agents (fastest: 300-800ms)
 *   2. Scrapling Python Sidecar for Cloudflare protected sites
 */
export async function fetchHtml(url: string): Promise<string | null> {
  const sidecarUrl = process.env.SCRAPLING_URL ?? 'http://localhost:8001';

  // 1. Direct plain HTTP with desktop user-agent
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const res = await fetchWithRetry(url, {
    headers: {
      'User-Agent': ua,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive',
    },
    signal: AbortSignal.timeout(6_000),
  });

  if (res) {
    const html = await res.text();
    if (html && html.length > 300) {
      return html;
    }
  }

  // 2. Fallback to Sidecar
  try {
    const sidecarRes = await fetch(`${sidecarUrl}/fetch_html`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, use_stealth: false }),
      signal: AbortSignal.timeout(5_000),
    });

    if (sidecarRes.ok) {
      const data = await sidecarRes.json();
      if (data.success && data.html && data.html.length > 300) {
        return data.html;
      }
    }
  } catch {
    // Sidecar offline or timed out
  }

  return null;
}

/**
 * Converts HTML to a condensed text representation suitable for AI extraction.
 *
 * Priority:
 *   1. Route through sidecar /extract_text (trafilatura — best quality)
 *   2. Fall back to local Cheerio parsing
 *
 * Returns: { text, pdfLinks }
 */
export async function htmlToTextEnriched(
  html: string,
  baseUrl: string,
): Promise<{ text: string; pdfLinks: string[] }> {
  // Fast, instant local Cheerio parsing
  let text = htmlToText(html, baseUrl);
  const pdfLinks = extractPdfLinksFromHtml(html, baseUrl);

  // Optimize: Actually read the contents of the first 5 PDFs found
  if (pdfLinks.length > 0) {
    console.log(`[pdf-extract] Attempting to parse text from ${Math.min(pdfLinks.length, 5)} PDF(s) for ${baseUrl}`);
    for (const link of pdfLinks.slice(0, 5)) {
      try {
        const doc = await downloadDocument(link);
        if (doc && doc.buffer) {
          const pdfText = await parsePdf(doc.buffer);
          if (pdfText && pdfText.length > 50) {
            console.log(`[pdf-extract] Successfully extracted ${pdfText.length} chars from ${link}`);
            // Append PDF text, capped to ~10k chars to avoid blowing up the prompt
            text += `\n\n--- CONTENT FROM ATTACHED PDF (${link}) ---\n${pdfText.substring(0, 10000)}`;
          }
        }
      } catch (err) {
        console.warn(`[pdf-extract] Failed to parse PDF ${link}:`, (err as Error).message);
      }
    }
  }

  return { text, pdfLinks };
}

/**
 * Legacy Cheerio-based HTML → text (used as fallback when sidecar unavailable).
 * Improved: keyword-weighted sorting, 500-line limit instead of 300.
 */
export function htmlToText(html: string, baseUrl: string): string {
  const $ = cheerio.load(html);

  // Remove noise
  $('script, style, noscript, nav, footer, header').remove();

  const procurementKeywords = ['tender', 'procurement', 'bid', 'appel', 'offre', 'contract', 'award', 'notice', 'closing'];

  const weighted: Array<{ line: string; weight: number }> = [];

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
      } catch { /* skip */ }
    } else if (!href.startsWith('http')) {
      try {
        fullUrl = new URL(href, baseUrl).toString();
      } catch { /* skip */ }
    }

    const line = `[LINK] ${text} => ${fullUrl}`;
    const weight = procurementKeywords.some(k => line.toLowerCase().includes(k)) ? 2 : 1;
    weighted.push({ line, weight });
  });

  // Extract visible text elements
  $('p, li, td, th, h1, h2, h3, h4').each((_i, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length > 10) {
      const weight = procurementKeywords.some(k => text.toLowerCase().includes(k)) ? 2 : 1;
      weighted.push({ line: text, weight });
    }
  });

  // Sort by weight descending (procurement-relevant content first)
  weighted.sort((a, b) => b.weight - a.weight);

  return weighted
    .slice(0, 500)
    .map(w => w.line)
    .join('\n');
}

/**
 * Extract PDF / document links from raw HTML (local Cheerio fallback).
 */
export function extractPdfLinksFromHtml(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];

  $('a[href]').each((_i, el) => {
    const href = $(el).attr('href') ?? '';
    const lower = href.toLowerCase();
    if (!['.pdf', '.doc', '.docx', '.xlsx', '.zip'].some(ext => lower.includes(ext))) return;

    let full = href;
    if (href.startsWith('/')) {
      try {
        full = `${new URL(baseUrl).origin}${href}`;
      } catch { /* skip */ }
    } else if (!href.startsWith('http')) {
      try {
        full = new URL(href, baseUrl).toString();
      } catch { /* skip */ }
    }

    if (full && !links.includes(full)) links.push(full);
  });

  return links;
}

/**
 * Fetch a PDF, DOCX, DOC, or XLSX from a direct URL and extract its plain text.
 *
 * Primary:  Python sidecar /extract_document (pdfminer + python-docx — best quality)
 * Fallback: JS-side pdf-parse (PDFs only)
 *
 * Returns empty string if parsing fails.
 */
export async function fetchAndParseDocument(url: string): Promise<string> {
  const sidecarUrl = process.env.SCRAPLING_URL ?? 'http://localhost:8001';

  // 1. Try sidecar (handles PDF, DOCX, DOC, XLSX)
  try {
    const res = await fetch(`${sidecarUrl}/extract_document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, max_chars: 40000 }),
      signal: AbortSignal.timeout(60_000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.text && data.text.length > 50) {
        console.log(`[fetchAndParseDocument:sidecar] ${data.file_type} → ${data.text.length} chars from ${url}`);
        return data.text as string;
      }
    }
  } catch {
    // Sidecar unavailable — fall through to JS fallback
  }

  // 2. JS fallback: pdf-parse (PDFs only)
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.pdf')) {
    try {
      const doc = await downloadDocument(url);
      if (doc) {
        const text = await parsePdf(doc.buffer);
        if (text && text.length > 50) {
          console.log(`[fetchAndParseDocument:js-fallback] pdf → ${text.length} chars from ${url}`);
          return text;
        }
      }
    } catch {
      // ignore
    }
  }

  console.warn(`[fetchAndParseDocument] Could not extract text from ${url}`);
  return '';
}

/**
 * Uses AI to extract structured compliance resources from scraped text.
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

  try {
    const { object } = await generateObjectWithFallback({
      schema: z.object({
        resources: z.array(z.object({
          title: z.string(),
          description: z.string(),
          resourceType: z.enum(['form', 'calculator', 'guideline', 'notice']),
          sourceUrl: z.string(),
        }))
      }),
      prompt: fullPrompt,
    });

    if (!object || !object.resources) return [];

    console.log(`[extractResourcesWithAI] AI extracted ${object.resources.length} resources`);
    return object.resources;
  } catch (err) {
    console.error(`[extractResourcesWithAI] Failed on ${baseUrl}:`, (err as Error).message);
    return [];
  }
}
