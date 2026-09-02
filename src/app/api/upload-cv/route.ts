import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { userDocuments } from '@/lib/db/schema/documents';
import { generateTextWithFallback } from '@/lib/ai/router';
import pdfParse from 'pdf-parse';
import crypto from 'crypto';

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
      const pdfData = await pdfParse(Buffer.from(arrayBuffer));
      extractedText = pdfData.text;
    }

    // Normalise whitespace
    let cleanText = extractedText
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

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

    let summary = null;
    const MAX_CHARS = 30000;

    if (cleanText.length > MAX_CHARS) {
      console.log(`[CV Upload] Document too large (${cleanText.length} chars). Compressing...`);
      try {
        const res = await generateTextWithFallback({
          system: 'You are an expert HR assistant. Summarize the following CV/document. Extract ALL key skills, experiences, dates, roles, and education precisely. Do not miss any keyword or technical skill. Output as a dense, structured markdown summary.',
          prompt: cleanText,
          temperature: 0.1,
        });
        summary = (res as { text: string }).text;
      } catch (err) {
        console.error('[CV Upload] Compression failed:', err);
        // Fallback: truncate the text if compression completely fails
        cleanText = cleanText.substring(0, MAX_CHARS) + '\n...[TRUNCATED]';
      }
    }

    const sessionId = crypto.randomUUID(); // Fallback anonymous session

    const [doc] = await db.insert(userDocuments).values({
      sessionId,
      filename: file.name,
      content: cleanText,
      summary,
    }).returning({ id: userDocuments.id });

    return NextResponse.json({
      success: true,
      text: summary || cleanText, // Return the compressed text if it exists
      filename: file.name,
      documentId: doc.id,
      characters: cleanText.length,
    });
  } catch (error) {
    console.error('[/api/upload-cv] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process CV. The file might be corrupted or in an unsupported format.' },
      { status: 500 }
    );
  }
}
