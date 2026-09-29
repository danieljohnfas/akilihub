import { PDFParse } from 'pdf-parse';

/**
 * Extracts plain text from a PDF using pdf-parse v2 (class-based API — v1's default-export
 * function no longer exists, which silently broke CV uploads and the tender summarizer).
 */
export async function extractPdfText(buffer: Buffer, opts: { maxPages?: number } = {}): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText(opts.maxPages ? { first: opts.maxPages } : undefined);
    return result.text ?? '';
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
