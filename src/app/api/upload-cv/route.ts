import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('cv') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const allowedTypes = ['application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF and plain text files are supported.' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    let extractedText = '';

    if (file.type === 'text/plain') {
      extractedText = await file.text();
    } else {
      // Use a computed import string so Turbopack skips static analysis of this module.
      // At runtime, serverExternalPackages ensures Node.js resolves pdf2json natively.
      const pkg = 'pdf2json';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { default: PDFParser } = await import(/* webpackIgnore: true */ pkg) as any;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      extractedText = await new Promise<string>((resolve, reject) => {
        // The '1' flag tells pdf2json to extract raw text content
        const pdfParser = new PDFParser(null, 1);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pdfParser.on('pdfParser_dataError', (errData: any) => reject(errData.parserError));
        pdfParser.on('pdfParser_dataReady', () => {
          resolve(pdfParser.getRawTextContent());
        });

        pdfParser.parseBuffer(buffer);
      });
    }

    // Clean up excessive whitespace from PDF parsing
    const cleanText = extractedText
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText || cleanText.length < 50) {
      return NextResponse.json(
        { error: 'Could not extract enough text from the file. Please try pasting your CV as text.' },
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
