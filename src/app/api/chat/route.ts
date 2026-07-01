import { NextRequest, NextResponse } from 'next/server';
import { StrategyEngine } from '@/lib/strategies/engine';
import { DifyStrategy, LangflowStrategy, MockAiStrategy, AiInput } from '@/lib/strategies/ai-strategies';

const engine = new StrategyEngine<AiInput, { response: string; confidence: number; sources: string[] }>([
  new DifyStrategy(),
  new LangflowStrategy(),
  new MockAiStrategy(),
]);

export async function POST(req: NextRequest) {
  try {
    const { query, contextParams } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
    }

    const { result, strategyUsed } = await engine.executeWithFallback({ query: query.trim(), contextParams });

    return NextResponse.json({
      response: result.response,
      confidence: result.confidence,
      sources: result.sources,
      strategyUsed,
    });
  } catch (error) {
    console.error('[/api/chat] All strategies failed:', error);
    return NextResponse.json({ error: 'Failed to process your query. Please try again.' }, { status: 500 });
  }
}
