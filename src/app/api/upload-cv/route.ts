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
      // PDF extraction
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // pdf-parse is CJS — use require to avoid ESM .default issues
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;
      const parsed = await pdfParse(buffer);
      extractedText = parsed.text;
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return NextResponse.json({ error: 'Could not extract enough text from the file. Please try pasting your CV as text.' }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      text: extractedText.trim(),
      filename: file.name,
      characters: extractedText.trim().length,
    });

  } catch (error) {
    console.error('[/api/upload-cv] Error:', error);
    return NextResponse.json({ error: 'Failed to process CV. Please try pasting your CV as text instead.' }, { status: 500 });
  }
}
