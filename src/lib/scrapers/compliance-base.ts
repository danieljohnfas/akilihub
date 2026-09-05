import * as cheerio from 'cheerio';
import { generateObjectWithFallback, extractVisionTextWithFallback } from '../ai/router';
import { z } from 'zod';
import { downloadDocument, parsePdf } from './pdf-extract';
import FirecrawlApp from '@mendable/firecrawl-js';
import TurndownService from 'turndown';
import { assertPublicHttpUrl } from '@/lib/security/safe-url';
export interface ComplianceResource {
  title: string;
  description: string;
  resourceType: 'form' | 'calculator' | 'guideline' | 'notice';
  sourceUrl: string;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

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
        return null; 
      }
    } catch {
    }
    if (attempt < maxRetries - 1) {
      await sleep(baseDelayMs * Math.pow(2, attempt));
    }
  }
  return null;
}

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
    if (!data.success || !data.text || data.text.length < 50) return null;

    return {
      text: data.text,
      pdfLinks: Array.isArray(data.pdf_links) ? data.pdf_links : [],
    };
  } catch {
    return null;
  }
}

export async function fetchHtml(url: string): Promise<string | null> {
  try {
    assertPublicHttpUrl(url);
  } catch (err) {
    console.warn("[fetchHtml] blocked URL:", url, err);
    return null;
  }
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  // 1. Direct fetch with realistic browser headers
  const res = await fetchWithRetry(
    url,
    {
      headers: {
        'User-Agent': ua,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8,sw;q=0.7',
      },
      signal: AbortSignal.timeout(10_000),
    },
    2,
    300,
  );

  if (res) {
    try {
      const html = await res.text();
      if (html && html.length > 300) return html;
    } catch {
    }
  }

  // 2. Scrapling Stealth Sidecar
  try {
    const sidecarUrl = process.env.SCRAPLING_URL ?? 'http://localhost:8001';
    const sidecarRes = await fetch(`${sidecarUrl}/fetch_html`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, use_stealth: true }),
      signal: AbortSignal.timeout(15_000),
    });

    if (sidecarRes.ok) {
      const data = await sidecarRes.json();
      if (data.success && data.html && data.html.length > 300) {
        return data.html;
      }
    }
  } catch {
  }

  // 3. Fallback: Jina Reader Proxy (bypasses Cloudflare / 403 bot challenges)
  try {
    const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'User-Agent': ua,
        Accept: 'text/plain,text/html',
        'X-No-Cache': 'true',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (jinaRes.ok) {
      const text = await jinaRes.text();
      if (text && text.length > 300) {
        return text;
      }
    }
  } catch {
  }

  // 4. Ultimate Fallback: Firecrawl (Cloud Headless Browser)
  // Handles heavy JS rendering when Sidecar and Jina fail.
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (firecrawlKey) {
    try {
      const app = new FirecrawlApp({ apiKey: firecrawlKey });
      const result = await app.scrapeUrl(url, {
        formats: ['html'],
        waitFor: 3000,
      } as any) as any;

      if (result.success && result.html && result.html.length > 300) {
        return result.html;
      }
    } catch {
    }
  }

  return null;
}

export async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length < 5_000 || buffer.length > 15_000_000) {
      return null;
    }

    return { buffer, contentType };
  } catch {
    return null;
  }
}

export async function extractTextFromImage(imageUrlOrBuffer: string | Buffer): Promise<string> {
  let imageBuffer: Buffer | null = null;

  if (typeof imageUrlOrBuffer === 'string') {
    const downloaded = await downloadImage(imageUrlOrBuffer);
    if (!downloaded) return '';
    imageBuffer = downloaded.buffer;
  } else {
    imageBuffer = imageUrlOrBuffer;
  }

  if (!imageBuffer || imageBuffer.length < 5_000) return '';

  const promptText = `You are an expert OCR and document analysis AI for East African jobs, tenders, business compliance, and official announcements.
Transcribe and extract ALL text from this image announcement/flyer.
Include:
- Job titles / Tender titles / Notice headings
- Organization / Company name
- Full job description / Tender scope
- Requirements, qualifications, skills, education, experience
- Deadlines / Closing dates / Submission dates
- Salary / Compensation figures if stated
- Application email / Portal URL / Physical address / Submission instructions
- Reference numbers / Tender numbers

Output the extracted text clearly and comprehensively in clean Markdown without conversational preamble.`;

  return await extractVisionTextWithFallback(imageBuffer, promptText);
}

const ANNOUNCEMENT_IMAGE_SIGNALS = [
  'advert', 'ad', 'tangazo', 'vacancy', 'vacancies', 'job', 'tender', 'procurement',
  'announcement', 'notice', 'circular', 'kazi', 'ajira', 'nafasi', 'poster', 'flyer',
  'post', 'upload', 'uploads', 'media', 'wp-content/uploads', 'attachment', 'banner'
];

const IGNORE_IMAGE_SIGNALS = [
  'avatar', 'logo', 'icon', 'favicon', 'social', 'facebook', 'twitter', 'instagram',
  'linkedin', 'whatsapp', 'youtube', 'tiktok', 'badge', 'footer', 'header', 'button',
  '1x1', 'pixel', 'spinner', 'thumb', 'emoji', 'star', 'arrow', 'close', 'menu'
];

export function extractAnnouncementImagesFromHtml(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const scoredImages: Array<{ url: string; score: number }> = [];

  const checkUrl = (rawUrl: string, altText: string = '', titleText: string = '') => {
    if (!rawUrl) return;
    const lower = rawUrl.toLowerCase();

    const isImageExt = ['.jpg', '.jpeg', '.png', '.webp'].some(ext => lower.includes(ext));
    if (!isImageExt && !lower.includes('/image') && !lower.includes('/uploads/')) return;

    if (IGNORE_IMAGE_SIGNALS.some(bad => lower.includes(bad) || altText.toLowerCase().includes(bad))) {
      return;
    }

    let fullUrl = rawUrl;
    if (rawUrl.startsWith('//')) {
      fullUrl = `https:${rawUrl}`;
    } else if (rawUrl.startsWith('/')) {
      try {
        fullUrl = `${new URL(baseUrl).origin}${rawUrl}`;
      } catch { /* skip */ }
    } else if (!rawUrl.startsWith('http')) {
      try {
        fullUrl = new URL(rawUrl, baseUrl).toString();
      } catch { /* skip */ }
    }

    let score = 1;
    const combinedContext = `${lower} ${altText.toLowerCase()} ${titleText.toLowerCase()}`;
    for (const signal of ANNOUNCEMENT_IMAGE_SIGNALS) {
      if (combinedContext.includes(signal)) score += 3;
    }

    if (score >= 3 && !scoredImages.some(item => item.url === fullUrl)) {
      scoredImages.push({ url: fullUrl, score });
    }
  };

  $('img').each((_i, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('data-original') || '';
    const alt = $(el).attr('alt') || '';
    const title = $(el).attr('title') || '';
    checkUrl(src, alt, title);
  });

  $('a[href]').each((_i, el) => {
    const href = $(el).attr('href') || '';
    const linkText = $(el).text().trim();
    checkUrl(href, linkText, '');
  });

  return scoredImages
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.url);
}

export async function htmlToTextEnriched(
  html: string,
  baseUrl: string,
): Promise<{ text: string; pdfLinks: string[]; images: string[] }> {
  let text = htmlToText(html, baseUrl);
  const pdfLinks = extractPdfLinksFromHtml(html, baseUrl);

  if (pdfLinks.length > 0) {
    console.log(`[pdf-extract] Attempting to parse text from ${Math.min(pdfLinks.length, 5)} document(s) for ${baseUrl}`);
    for (const link of pdfLinks.slice(0, 5)) {
      try {
        const doc = await downloadDocument(link);
        if (doc && doc.buffer) {
          const pdfText = await parsePdf(doc.buffer);
          if (pdfText && pdfText.length > 50) {
            console.log(`[pdf-extract] Successfully extracted ${pdfText.length} chars from ${link}`);
            text += `\n\n--- CONTENT FROM ATTACHED PDF (${link}) ---\n${pdfText.substring(0, 10000)}`;
          }
        }
      } catch (err) {
        console.warn(`[pdf-extract] Failed to parse PDF ${link}:`, (err as Error).message);
      }
    }
  }

  const imageLinks = extractAnnouncementImagesFromHtml(html, baseUrl);
  if (imageLinks.length > 0) {
    console.log(`[image-vision] Attempting to transcribe ${Math.min(imageLinks.length, 2)} image(s) for ${baseUrl}`);
    for (const imgUrl of imageLinks.slice(0, 2)) {
      try {
        const imgText = await extractTextFromImage(imgUrl);
        if (imgText && imgText.length > 50) {
          console.log(`[image-vision] Successfully transcribed ${imgText.length} chars from ${imgUrl}`);
          text += `\n\n--- CONTENT FROM ATTACHED IMAGE FLYER (${imgUrl}) ---\n${imgText.substring(0, 10000)}`;
        }
      } catch (err) {
        console.warn(`[image-vision] Failed to transcribe image ${imgUrl}:`, (err as Error).message);
      }
    }
  }

  return { text, pdfLinks, images: imageLinks };
}

export function htmlToText(html: string, baseUrl: string): string {
  // If input is already markdown or plain text from stealth reader proxy
  if (
    (!html.includes('<html') && !html.includes('<body') && !html.includes('<div') && !html.includes('<p>')) ||
    html.startsWith('Title: ') ||
    html.startsWith('# ') ||
    html.includes('Markdown Content:')
  ) {
    return html.substring(0, 15000);
  }

  const $ = cheerio.load(html);

  // Remove noisy elements
  $('script, style, noscript, nav, footer, header, iframe, svg, canvas').remove();

  // Make links absolute before conversion
  $('a[href]').each((_i, el) => {
    const href = $(el).attr('href') ?? '';
    if (href.startsWith('/') || !href.startsWith('http')) {
      try { $(el).attr('href', new URL(href, baseUrl).toString()); } catch { /* skip */ }
    }
  });

  // Make images absolute before conversion
  $('img').each((_i, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    if (src.startsWith('/') || (!src.startsWith('http') && src.length > 0)) {
      try { $(el).attr('src', new URL(src, baseUrl).toString()); } catch { /* skip */ }
    }
  });

  // Use Turndown for clean Markdown conversion, preserving order and structure!
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    hr: '---',
  });
  
  // Clean up noisy tags but keep their contents
  turndownService.keep(['table', 'tr', 'td', 'th', 'tbody', 'thead', 'tfoot']);

  let markdown = '';
  try {
    markdown = turndownService.turndown($.html() || '');
  } catch (err) {
    console.error('[htmlToText] Turndown failed, falling back to text:', (err as Error).message);
    markdown = $('body').text() || $.text();
  }

  // Fallback if turndown somehow returns empty but body has text
  if (!markdown.trim()) {
    markdown = $('body').text() || $.text();
  }

  return markdown.substring(0, 15000);
}

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

export async function fetchAndParseDocument(url: string): Promise<string> {
  const lowerUrl = url.toLowerCase().split('?')[0];

  if (['.jpg', '.jpeg', '.png', '.webp'].some(ext => lowerUrl.endsWith(ext) || lowerUrl.includes(ext))) {
    const imgText = await extractTextFromImage(url);
    if (imgText && imgText.length > 50) {
      console.log(`[fetchAndParseDocument:image-vision] image → ${imgText.length} chars from ${url}`);
      return imgText;
    }
  }

  const sidecarUrl = process.env.SCRAPLING_URL ?? 'http://localhost:8001';

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
  }

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
    }
  }

  console.warn(`[fetchAndParseDocument] Could not extract text from ${url}`);
  return '';
}

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

    const normalizedResources = object.resources.map((r: any) => ({
      ...r,
      resourceType: (r.resourceType || 'notice').toLowerCase().replace(/[\s-]/g, '_')
    }));

    console.log(`[extractResourcesWithAI] AI extracted ${normalizedResources.length} resources`);
    return normalizedResources;
  } catch (err) {
    console.error(`[extractResourcesWithAI] Failed on ${baseUrl}:`, (err as Error).message);
    return [];
  }
}
