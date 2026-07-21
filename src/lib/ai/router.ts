import { generateObject, generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
import { createCohere } from '@ai-sdk/cohere';
import { keyPool } from './key-pool';

// ------------------------------------------------------------------
// 1. DYNAMIC PROVIDER LOADER
// ------------------------------------------------------------------

// Helper: extract all env vars starting with baseName (supports _2, _3, etc.)
function getEnvKeys(baseName: string): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(baseName) && value && value.trim() !== '') {
      keys.push(value.trim());
    }
  }
  return keys;
}

// -- GOOGLE (Gemini) --
// Most reliable. Supports json_schema structured output natively.
getEnvKeys('GOOGLE_GENERATIVE_AI_API_KEY').forEach((key, i) => {
  // Use a fresh instance per key so each has isolated state
  const { google: makeGoogle } = require('@ai-sdk/google');
  const g = makeGoogle('gemini-2.5-flash', { apiKey: key });
  keyPool.register({
    id: `google-flash-${i + 1}`,
    name: `Google Gemini Flash (${i + 1})`,
    model: g,
    supportsStructured: true,
  });
});

// -- GROQ --
// Supports structured output via 'json' mode on llama-3.3-70b-versatile.
// Note: does NOT support json_schema mode — use mode: 'json' when calling.
getEnvKeys('GROQ_API_KEY').forEach((key, i) => {
  const groq = createGroq({ apiKey: key });
  keyPool.register({
    id: `groq-llama33-${i + 1}`,
    name: `Groq LLaMA 3.3 70B (${i + 1})`,
    model: groq('llama-3.3-70b-versatile'),
    supportsStructured: true,
  });
});

// -- MISTRAL --
// Supports json_schema structured output.
getEnvKeys('MISTRAL_API_KEY').forEach((key, i) => {
  const mistral = createMistral({ apiKey: key });
  keyPool.register({
    id: `mistral-small-${i + 1}`,
    name: `Mistral Small (${i + 1})`,
    model: mistral('mistral-small-latest'),
    supportsStructured: true,
  });
});

// -- COHERE --
// Command R+ supports json_schema structured output.
getEnvKeys('COHERE_API_KEY').forEach((key, i) => {
  const cohere = createCohere({ apiKey: key });
  keyPool.register({
    id: `cohere-command-r-${i + 1}`,
    name: `Cohere Command R+ (${i + 1})`,
    model: cohere('command-r-plus-08-2024'),
    supportsStructured: true,
  });
});

// -- MINIMAX --
// Uses OpenAI-compatible endpoint.
getEnvKeys('MINIMAX_API_KEY').forEach((key, i) => {
  const { createOpenAI } = require('@ai-sdk/openai');
  const minimax = createOpenAI({ 
    apiKey: key,
    baseURL: 'https://api.minimax.chat/v1',
  });
  keyPool.register({
    id: `minimax-m3-${i + 1}`,
    name: `Minimax M3 (${i + 1})`,
    model: minimax('MiniMax-Text-01'), // or abab6.5s-chat depending on user's exact M3 mapping
    supportsStructured: true, // Uses OpenAI structured output wrapper
  });
});

// -- OPENROUTER --
getEnvKeys('OPENROUTER_API_KEY').forEach((key, i) => {
  const { createOpenAI } = require('@ai-sdk/openai');
  const openrouter = createOpenAI({ apiKey: key, baseURL: 'https://openrouter.ai/api/v1' });
  keyPool.register({
    id: `openrouter-${i + 1}`,
    name: `OpenRouter (${i + 1})`,
    model: openrouter('meta-llama/llama-3.3-70b-instruct'),
    supportsStructured: true,
  });
});

// -- DEEPSEEK --
getEnvKeys('DEEPSEEK_API_KEY').forEach((key, i) => {
  const { createOpenAI } = require('@ai-sdk/openai');
  const deepseek = createOpenAI({ apiKey: key, baseURL: 'https://api.deepseek.com' });
  keyPool.register({
    id: `deepseek-${i + 1}`,
    name: `DeepSeek Chat (${i + 1})`,
    model: deepseek('deepseek-v4-flash'),
    supportsStructured: true,
  });
});

// -- SAMBANOVA --
getEnvKeys('SAMBANOVA_API_KEY').forEach((key, i) => {
  const { createOpenAI } = require('@ai-sdk/openai');
  const sambanova = createOpenAI({ apiKey: key, baseURL: 'https://api.sambanova.ai/v1' });
  keyPool.register({
    id: `sambanova-${i + 1}`,
    name: `SambaNova Llama3.1 70B (${i + 1})`,
    model: sambanova('Meta-Llama-3.3-70B-Instruct'),
    supportsStructured: true,
  });
});

// -- CEREBRAS --
getEnvKeys('CEREBRAS_API_KEY').forEach((key, i) => {
  const { createOpenAI } = require('@ai-sdk/openai');
  const cerebras = createOpenAI({ apiKey: key, baseURL: 'https://api.cerebras.ai/v1' });
  keyPool.register({
    id: `cerebras-${i + 1}`,
    name: `Cerebras Llama3.1 70B (${i + 1})`,
    model: cerebras('gemma-4-31b'),
    supportsStructured: true,
  });
});

// -- HYPERBOLIC --
getEnvKeys('HYPERBOLIC_API_KEY').forEach((key, i) => {
  const { createOpenAI } = require('@ai-sdk/openai');
  const hyperbolic = createOpenAI({ apiKey: key, baseURL: 'https://api.hyperbolic.xyz/v1' });
  keyPool.register({
    id: `hyperbolic-${i + 1}`,
    name: `Hyperbolic Llama3.1 70B (${i + 1})`,
    model: hyperbolic('meta-llama/Llama-3.3-70B-Instruct'),
    supportsStructured: true,
  });
});

if (keyPool.size === 0) {
  console.warn('[AI Router] No API keys found! AI generation will fail.');
} else {
  console.log(`[AI Router] Loaded ${keyPool.size} model(s) into the pool.`);
}

// ------------------------------------------------------------------
// 2. GENERATION WITH FALLBACK
// ------------------------------------------------------------------

const MAX_RETRIES = 3;
const AI_TIMEOUT_MS = 45_000; // 45s per attempt

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
export async function generateObjectWithFallback(params: Record<string, any>) {
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
          // Use json mode for Groq (doesn't support json_schema)
          ...(activeKey.id.startsWith('groq-') ? { mode: 'json' } : {}),
        }),
        AI_TIMEOUT_MS,
        activeKey.name,
      );

      keyPool.markSuccess(activeKey.id);
      return result;

    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      console.warn(`[AI Router] ${activeKey.name} failed (attempt ${attempt}): ${err.message?.slice(0, 120)}`);
      lastError = error;

      // Schema/validation errors are unrecoverable — don't burn the key
      if (err.name === 'TypeValidationError' || err.name === 'JSONParseError') {
        keyPool.markSuccess(activeKey.id); // key is fine, schema is the problem
        throw error;
      }

      keyPool.markFailed(activeKey.id);
    }
  }

  console.error('[AI Router] All fallback attempts exhausted.');
  return {} as any;
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
