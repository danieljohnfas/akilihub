import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Decodes escaped characters inside a PDF string literal.
 */
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

/**
 * Extracts readable text from a PDF buffer without any external libraries.
 * Covers Tj (single string) and TJ (array of strings/kerning) text operators.
 */
function extractTextFromPDFBuffer(buffer: Buffer): string {
  const str = buffer.toString('latin1');
  const texts: string[] = [];

  // Match single-string text operator:  (Hello World) Tj
  const tjRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = tjRe.exec(str)) !== null) {
    const decoded = decodePDFString(m[1]).trim();
    if (decoded) texts.push(decoded);
  }

  // Match TJ array operator:  [(Hello) 20 (World)] TJ
  const tjArrRe = /\[([^\]]*)\]\s*TJ/g;
  while ((m = tjArrRe.exec(str)) !== null) {
    const inner = m[1];
    const innerStrRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
    let im: RegExpExecArray | null;
    while ((im = innerStrRe.exec(inner)) !== null) {
      const decoded = decodePDFString(im[1]).trim();
      if (decoded) texts.push(decoded);
    }
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
      const buffer = Buffer.from(arrayBuffer);
      extractedText = extractTextFromPDFBuffer(buffer);
    }

    // Normalise whitespace
    const cleanText = extractedText
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

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
