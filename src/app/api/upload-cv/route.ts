import { NextRequest, NextResponse } from 'next/server';
import { inflateSync, inflateRawSync } from 'zlib';

export const runtime = 'nodejs';

/** Decode escaped characters inside a PDF string literal. */
function decodePDFString(raw: string): string {
  return raw
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

/** Apply Tj / TJ text operators to a (decompressed) content stream string. */
function gatherText(content: string, out: string[]): void {
  // (Hello World) Tj
  const tjRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = tjRe.exec(content)) !== null) {
    const t = decodePDFString(m[1]).trim();
    if (t) out.push(t);
  }

  // [(Hello) 20 (World)] TJ
  const tjArrRe = /\[([^\]]*)\]\s*TJ/g;
  while ((m = tjArrRe.exec(content)) !== null) {
    const inner = m[1];
    const strRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
    let im: RegExpExecArray | null;
    // Collect parts from this array, then join them as one chunk
    const parts: string[] = [];
    while ((im = strRe.exec(inner)) !== null) {
      const t = decodePDFString(im[1]);
      if (t) parts.push(t);
    }
    if (parts.length) out.push(parts.join(''));
  }
}

/**
 * Zero-dependency PDF text extractor.
 * Handles both uncompressed streams and FlateDecode (zlib) compressed streams,
 * covering virtually all CVs produced by Word, Google Docs, LibreOffice, etc.
 */
function extractTextFromPDFBuffer(buffer: Buffer): string {
  const latin = buffer.toString('latin1');
  const texts: string[] = [];

  // Locate every stream ... endstream block together with its preceding dictionary.
  // The dictionary immediately before `stream` determines the filter used.
  const dictStreamRe = /<<([\s\S]{0,800}?)>>\s*\r?\nstream\r?\n/g;
  let dm: RegExpExecArray | null;

  while ((dm = dictStreamRe.exec(latin)) !== null) {
    const dictContent = dm[1];
    const streamStart = dm.index + dm[0].length;

    // Find the matching endstream
    const endIdx = latin.indexOf('endstream', streamStart);
    if (endIdx === -1) continue;

    const rawStream = latin.slice(streamStart, endIdx);
    const isFlate =
      dictContent.includes('/FlateDecode') ||
      dictContent.includes('/Fl\n') ||
      dictContent.includes('/Fl ') ||
      dictContent.includes('/Fl>') ||
      dictContent.includes('/Fl\r');

    if (isFlate) {
      // Decompress and extract
      const streamBuf = Buffer.from(rawStream, 'latin1');
      let decompressed: Buffer | null = null;
      try {
        decompressed = inflateSync(streamBuf);
      } catch {
        try {
          decompressed = inflateRawSync(streamBuf);
        } catch {
          // Cannot decompress – skip
        }
      }
      if (decompressed) {
        gatherText(decompressed.toString('latin1'), texts);
      }
    } else {
      // Uncompressed – extract directly
      gatherText(rawStream, texts);
    }
  }

  // Fallback: try extracting from the raw file if nothing found yet
  // (catches PDFs where streams aren't preceded by a << dict >>)
  if (texts.length === 0) {
    gatherText(latin, texts);
  }

  return texts.join(' ');
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('cv') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const allowedTypes = ['application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF and plain text files are supported.' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    let extractedText = '';

    if (file.type === 'text/plain') {
      extractedText = await file.text();
    } else {
      const arrayBuffer = await file.arrayBuffer();
      extractedText = extractTextFromPDFBuffer(Buffer.from(arrayBuffer));
    }

    // Normalise whitespace
    let cleanText = extractedText
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Collapse single-character tokens separated by spaces that form words.
    // PDFs using character-level TJ kerning produce "D a n i e l" — fix to "Daniel".
    // Strategy: if a run of >=3 consecutive space-separated single chars appears, merge them.
    cleanText = cleanText.replace(
      /((?:^|\s)\S(?=\s\S(?:\s|$))){1}((?:\s\S){2,})/g,
      (match) => match.replace(/\s(?=\S(\s|$))/g, '').replace(/^\s/, ' ')
    );
    // Also strip non-printable characters (chars below space except tab)
    cleanText = cleanText.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').trim();

    if (!cleanText || cleanText.length < 50) {
      return NextResponse.json(
        {
          error:
            'Could not extract enough text from this PDF. ' +
            'If your CV was created by scanning a physical document it may be image-only. ' +
            'Please paste your CV as text instead.',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      text: cleanText,
      filename: file.name,
      characters: cleanText.length,
    });
  } catch (error) {
    console.error('[/api/upload-cv] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process CV. Please try pasting your CV as text instead.' },
      { status: 500 }
    );
  }
}
