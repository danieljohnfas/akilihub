import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { userDocuments } from '@/lib/db/schema/documents';
import { generateTextWithFallback } from '@/lib/ai/router';

import crypto from 'crypto';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, { prefix: 'upload-cv', max: 5, window: '1 m' });
  if (limited) return limited;

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
    let fileBuffer: Buffer | null = null;

    if (file.type === 'text/plain') {
      extractedText = await file.text();
    } else {
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      console.log(`[CV Upload] Extracting text from PDF using explicit Gemini REST API...`);
      try {
        let googleKey = '';
        for (const [k, v] of Object.entries(process.env)) {
          if ((k.startsWith('GOOGLE_GENERATIVE_AI_API_KEY') || k.startsWith('GEMINI_API_KEY')) && v) {
            googleKey = v.trim();
            break;
          }
        }
        
        if (!googleKey) {
          throw new Error('No Google API key configured for PDF extraction.');
        }
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: 'You are an expert OCR and HR assistant. Read the provided CV document and extract ALL text, skills, experiences, and education precisely. Output exactly the text extracted.' },
                { inlineData: { mimeType: 'application/pdf', data: fileBuffer.toString('base64') } }
              ]
            }]
          })
        });

        const aiRes = await response.json();
        
        if (aiRes.error) {
          throw new Error(aiRes.error.message);
        }
        
        extractedText = aiRes.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log(`[CV Upload] AI extracted ${extractedText.length} chars from PDF.`);
      } catch (err) {
        console.error('[CV Upload] AI Vision failed:', err);
      }
    }

    // Normalise whitespace
    let cleanText = extractedText
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Also strip non-printable characters (chars below space except tab)
    cleanText = cleanText.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').trim();

    if (!cleanText) {
      cleanText = "No text could be extracted from this document.";
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
