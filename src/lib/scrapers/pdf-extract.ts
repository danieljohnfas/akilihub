/**
 * pdf-extract.ts
 *
 * Extracts PDF links from a scraped HTML page and, for each link,
 * downloads the PDF and extracts its plain text.
 *
 * Plain text is stored in the `tenderAttachments` table so AI can
 * analyse the full tender specification rather than just the listing.
 *
 * Strategy:
 *   1. Receive HTML content + base URL.
 *   2. Scan all <a href> tags for PDF / .doc / .docx links.
 *   3. For each link, fetch the file (with a realistic browser UA).
 *   4. Parse text with `pdf-parse` (PDF) or return raw buffer size for others.
 *   5. Upsert into `tender_attachments` (conflict = file_url unique).
 *
 * Dependencies:
 *   - pdf-parse (pure JS, no native bindings needed)
 *   - cheerio (already in package.json)
 */

import * as cheerio from 'cheerio';
import { db } from '../db/client';
import { tenderAttachments } from '../db/schema/attachments';

// Lazily import pdf-parse only when needed (keeps cold starts fast)
export async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const result = await pdfParse(buffer);
    return (result.text as string).trim();
  } catch {
    return '';
  }
}

const DOC_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xlsx', '.zip'];

function getFileType(url: string): 'pdf' | 'doc' | 'xlsx' | 'zip' | 'other' {
  const lower = url.toLowerCase();
  if (lower.includes('.pdf'))  return 'pdf';
  if (lower.includes('.docx') || lower.includes('.doc')) return 'doc';
  if (lower.includes('.xlsx')) return 'xlsx';
  if (lower.includes('.zip'))  return 'zip';
  return 'other';
}

/**
 * Extract all document links (PDF, DOC, DOCX, XLSX, ZIP) from HTML.
 */
export function extractDocumentLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];

  $('a[href]').each((_i, el) => {
    const href = $(el).attr('href') ?? '';
    const lower = href.toLowerCase();
    if (!DOC_EXTENSIONS.some(ext => lower.includes(ext))) return;

    let full = href;
    if (href.startsWith('/')) {
      try {
        const base = new URL(baseUrl);
        full = `${base.origin}${href}`;
      } catch { /* skip malformed */ }
    } else if (!href.startsWith('http')) {
      try {
        full = new URL(href, baseUrl).toString();
      } catch { /* skip malformed */ }
    }

    if (full && !links.includes(full)) links.push(full);
  });

  return links;
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Download a single document URL and return { buffer, sizeBytes }.
 * Returns null if the fetch fails or times out.
 */
export async function downloadDocument(url: string): Promise<{ buffer: Buffer; sizeBytes: number } | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/pdf,application/octet-stream,*/*' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return { buffer, sizeBytes: buffer.byteLength };
  } catch {
    return null;
  }
}

/**
 * Download and parse all document attachments found on a tender page,
 * then upsert them into the `tender_attachments` table.
 *
 * @param html       Rendered HTML of the tender listing page
 * @param baseUrl    The page URL (used to resolve relative links)
 * @param tenderId   UUID of the parent tender record
 * @param maxAttachments  Cap to avoid thrashing on pages with 100+ links
 * @returns Number of attachments successfully processed
 */
export async function extractAndSaveAttachments(
  html: string,
  baseUrl: string,
  tenderId: string,
  maxAttachments = 5,
): Promise<number> {
  const links = extractDocumentLinks(html, baseUrl).slice(0, maxAttachments);
  if (links.length === 0) return 0;

  console.log(`[pdf-extract] Found ${links.length} document link(s) for tender ${tenderId}`);

  let saved = 0;

  for (const url of links) {
    try {
      // Extract filename from URL
      const fileName = decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'attachment');
      const fileType = getFileType(url);

      // Check if already stored
      const existing = await db
        .select({ id: tenderAttachments.id })
        .from(tenderAttachments)
        .limit(1);
      // (onConflictDoNothing handles duplicates via unique file_url index)

      const download = await downloadDocument(url);
      let extractedText: string | null = null;
      let fileSizeBytes: number | null = null;

      if (download) {
        fileSizeBytes = download.sizeBytes;
        if (fileType === 'pdf') {
          extractedText = await parsePdf(download.buffer);
          if (extractedText.length > 50_000) {
            extractedText = extractedText.slice(0, 50_000); // cap at 50 KB of text
          }
        }
      }

      await db.insert(tenderAttachments).values({
        tenderId,
        fileName,
        fileUrl: url,
        fileType,
        fileSizeBytes,
        extractedText: extractedText || null,
        extractionStatus: download ? 'done' : 'failed',
      }).onConflictDoNothing();

      console.log(`[pdf-extract] Saved attachment: ${fileName} (${fileSizeBytes ?? '?'} bytes)`);
      saved++;
    } catch (err) {
      console.error(`[pdf-extract] Failed for ${url}:`, (err as Error).message);
    }
  }

  return saved;
}
