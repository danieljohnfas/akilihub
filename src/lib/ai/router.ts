import { generateObject, generateText, type GenerateObjectResult } from 'ai';
import type { ZodType } from 'zod';
import { createGoogle } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
import { createCohere } from '@ai-sdk/cohere';
import { createOpenAI } from '@ai-sdk/openai';
import { keyPool } from './key-pool';

// ------------------------------------------------------------------
// 1. DYNAMIC PROVIDER LOADER
// ------------------------------------------------------------------

// Helper: extract all env vars starting with baseName (supports _2, _3, etc.)
// Matches exactly baseName or baseName_<digits> to avoid picking up unrelated
// env vars that share the same prefix (e.g. GROQ_API_KEYSTONE).
function getEnvKeys(baseName: string): string[] {
  const keys: string[] = [];
  const pattern = new RegExp(`^${baseName}(?:_\\d+)?$`);
  for (const [key, value] of Object.entries(process.env)) {
    if (pattern.test(key) && value && value.trim() !== '') {
      keys.push(value.trim());
    }
  }
  return keys;
}

// -- MISTRAL --
// Extremely fast (~1.5s) and natively supports json_schema structured output.
getEnvKeys('MISTRAL_API_KEY').forEach((key, i) => {
  const mistral = createMistral({ apiKey: key });
  keyPool.register({
    id: `mistral-small-${i + 1}`,
    name: `Mistral Small (${i + 1})`,
    model: mistral('mistral-small-latest'),
    supportsStructured: true,
    priority: 1,
  });
});

// -- COHERE (Command R+) --
getEnvKeys('COHERE_API_KEY').forEach((key, i) => {
  const cohere = createCohere({ apiKey: key });
  keyPool.register({
    id: `cohere-command-r-${i + 1}`,
    name: `Cohere Command R+ (${i + 1})`,
    model: cohere('command-r-plus-08-2024'),
    supportsStructured: true,
    priority: 2,
  });
});

// -- GOOGLE (Gemini 2.0 Flash) --
getEnvKeys('GOOGLE_GENERATIVE_AI_API_KEY').forEach((key, i) => {
  const makeGoogle = createGoogle({ apiKey: key });
  keyPool.register({
    id: `google-flash-${i + 1}`,
    name: `Google Gemini Flash (${i + 1})`,
    model: makeGoogle('gemini-2.0-flash'),
    supportsStructured: true,
    priority: 3,
  });
});

// (Removed dead providers: Minimax, OpenRouter, DeepSeek, SambaNova, Cerebras, Hyperbolic)

if (keyPool.size === 0) {
  console.warn('[AI Router] No API keys found! AI generation will fail.');
} else {
  console.log(`[AI Router] Loaded ${keyPool.size} model(s) into the pool.`);
}

// ------------------------------------------------------------------
// 2. GENERATION WITH FALLBACK
// ------------------------------------------------------------------

const MAX_RETRIES = 4;
const AI_TIMEOUT_MS = 45_000; // 45s per attempt to allow full structured JSON completion

/**
 * Wraps a promise with a hard timeout.
 * Unlike AbortSignal.timeout(), this works on all Node.js versions and
 * doesn't silently hang if the underlying fetch ignores the signal.
 */
function withHardTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`[Timeout] ${label} exceeded ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateObjectWithFallback<T = unknown>(
  params: Record<string, any> & { schema?: ZodType<T> }
): Promise<GenerateObjectResult<T>> {
  if (keyPool.getAvailableCount() === 0) {
    throw new Error('[AI Router] All models are on cooldown. Try again in a moment.');
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let activeKey = keyPool.getNextKey(true);
    if (!activeKey) {
      // All keys on cooldown — wait 5s and try once more
      await new Promise(r => setTimeout(r, 5000));
      activeKey = keyPool.getNextKey(true);
      if (!activeKey) break;
    }

    console.log(`[AI Router] [Attempt ${attempt}/${MAX_RETRIES}] → ${activeKey.name}`);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await withHardTimeout(
        (generateObject as any)({
          ...params,
          model: activeKey.model,
          // Use json mode for models that do not natively support json_schema
          ...(!activeKey.id.startsWith('google-') && !activeKey.id.startsWith('mistral-') && !activeKey.id.startsWith('cohere-') ? { mode: 'json' } : {}),
        }),
        AI_TIMEOUT_MS,
        activeKey.name,
      );

      keyPool.markSuccess(activeKey.id);
      return result as GenerateObjectResult<T>;

    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      console.warn(`[AI Router] ${activeKey.name} failed (attempt ${attempt}): ${err.message?.slice(0, 120)}`);
      // If schema/validation fails or no object generated, let the next model try
      if (err.name === 'TypeValidationError' || err.name === 'JSONParseError' || err.message?.includes('No object generated')) {
        continue;
      }

      keyPool.markFailed(activeKey.id);
    }
  }

  console.error('[AI Router] All fallback attempts exhausted.');
  throw lastError ?? new Error('[AI Router] All fallback attempts exhausted with no specific error.');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateTextWithFallback(params: Record<string, any>) {
  if (keyPool.getAvailableCount() === 0) {
    throw new Error('[AI Router] All models are on cooldown. Try again in a moment.');
  }

  let lastError: unknown = null;
  const requiresStructured = !!params.tools || !!params.responseFormat;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const activeKey = keyPool.getNextKey(requiresStructured);
    if (!activeKey) break;

    console.log(`[AI Router] [Text][Attempt ${attempt}/${MAX_RETRIES}] → ${activeKey.name}`);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await withHardTimeout(
        (generateText as any)({ ...params, model: activeKey.model }),
        AI_TIMEOUT_MS,
        activeKey.name,
      );
      keyPool.markSuccess(activeKey.id);
      return result;

    } catch (error: unknown) {
      const err = error as Error;
      console.warn(`[AI Router] ${activeKey.name} failed: ${err.message?.slice(0, 120)}`);
      lastError = error;
      keyPool.markFailed(activeKey.id);
    }
  }

  throw lastError ?? new Error('[AI Router] Unknown failure');
}
