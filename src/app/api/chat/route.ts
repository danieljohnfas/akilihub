import { NextRequest, NextResponse } from 'next/server';
import { StrategyEngine } from '@/lib/strategies/engine';
import {
  DifyStrategy,
  LangflowStrategy,
  GeminiFlashLiteStrategy,
  GeminiFlashStrategy,
  GeminiFlash8BStrategy,
  GeminiFlash15Strategy,
  GeminiPro15Strategy,
  GroqStrategy,
  CerebrasStrategy,
  MistralStrategy,
  TogetherStrategy,
  CohereStrategy,
  HuggingFaceStrategy,
  OpenRouterStrategy,
  UnavailableStrategy,
  AiInput,
} from '@/lib/strategies/ai-strategies';

/**
 * Strategy execution order — optimized for speed and quota efficiency:
 *
 * 1.  Dify              — Custom workflow (if configured)
 * 2.  Langflow          — Custom workflow (if configured)
 * 3.  Gemini 2.0 Flash       — 1,500 req/day free (fast, confirmed working)
 * 4.  Gemini 2.0 Flash Lite  — 1,500 req/day free
 * 5.  Groq (Llama 3.3 70B)  — 14,400 req/day free  ← moved up (fast + reliable)
 * 6.  Cerebras (Llama 70B)  — fast free tier
 * 7.  Mistral (Mistral Small)— free credit
 * 8.  Gemini 1.5 Flash       — 1,500 req/day free  (versioned model name)
 * 9.  Gemini 1.5 Flash 8B    — 1,500 req/day free  (versioned model name)
 * 10. Gemini 1.5 Pro         —    50 req/day free
 * 11. Together AI (Llama 8B) — $1 free credit
 * 12. Cohere (Command R)     — 1,000 calls/mo free
 * 13. Hugging Face (Mistral) — serverless free
 * 14. OpenRouter             — free model tier
 * 15. Unavailable            — final error fallback
 */
const engine = new StrategyEngine<AiInput, { response: string; confidence: number; sources: string[] }>([
  new DifyStrategy(),
  new LangflowStrategy(),
  new GeminiFlashStrategy(),
  new GeminiFlashLiteStrategy(),
  new GroqStrategy(),
  new CerebrasStrategy(),
  new MistralStrategy(),
  new GeminiFlash15Strategy(),
  new GeminiFlash8BStrategy(),
  new GeminiPro15Strategy(),
  new TogetherStrategy(),
  new CohereStrategy(),
  new HuggingFaceStrategy(),
  new OpenRouterStrategy(),
  new UnavailableStrategy(),
]);


export async function POST(req: NextRequest) {
  try {
    const { query, contextParams } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
    }

    const { result, strategyUsed } = await engine.executeWithFallback({
      query: query.trim(),
      contextParams,
    });

    return NextResponse.json({
      response: result.response,
      confidence: result.confidence,
      sources: result.sources,
      strategyUsed,
    });
  } catch (error) {
    console.error('[/api/chat] All strategies failed:', error);
    return NextResponse.json(
      { error: 'All AI services are currently at capacity. Please try again in a few minutes.' },
      { status: 503 }
    );
  }
}
