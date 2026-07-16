import { NextRequest, NextResponse } from 'next/server';
import { generateTextWithFallback } from '@/lib/ai/router';

export async function POST(req: NextRequest) {
  try {
    const { query, contextParams } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
    }

    const systemPrompt = `You are AkiliBrain, an expert assistant for navigating East African government tenders, jobs, and compliance requirements. Provide concise, helpful answers.
Context: ${JSON.stringify(contextParams)}`;

    const result = await generateTextWithFallback({
      system: systemPrompt,
      prompt: query.trim(),
    });

    return NextResponse.json({
      response: result.text,
      confidence: 1.0,
      sources: [],
      strategyUsed: 'Vercel AI Pool',
    });
  } catch (error) {
    console.error('[/api/chat] All strategies failed:', error);
    return NextResponse.json(
      { error: 'All AI services are currently at capacity. Please try again in a few minutes.' },
      { status: 503 }
    );
  }
}
