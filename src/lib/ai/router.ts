import { generateObject, generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
import { createCohere } from '@ai-sdk/cohere';
import { keyPool } from './key-pool';

// ------------------------------------------------------------------
// 1. DYNAMIC PROVIDER LOADER
// ------------------------------------------------------------------

// Helper to extract numbered env vars (e.g., GROQ_API_KEY, GROQ_API_KEY_2)
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
getEnvKeys('GOOGLE_GENERATIVE_AI_API_KEY').forEach((key, i) => {
  const g = google('gemini-2.5-flash');
  keyPool.register({
    id: `google-flash-${i + 1}`,
    name: `Google Gemini Flash (${i + 1})`,
    model: g,
    supportsStructured: true,
  });
});

// -- OPENROUTER --
// NOTE: As of mid-2025, most OpenRouter :free models require a payment method.
// Re-enable below when you add credits to the OpenRouter account.
// getEnvKeys('OPENROUTER_API_KEY').forEach((key, i) => { ... });

// -- GROQ --
getEnvKeys('GROQ_API_KEY').forEach((key, i) => {
  const groq = createGroq({ apiKey: key });
  // openai/gpt-oss-20b and 120b support json_schema structured output on Groq
  keyPool.register({ id: `groq-gpt20b-${i+1}`, name: `Groq GPT-OSS-20B (${i+1})`, model: groq('openai/gpt-oss-20b'), supportsStructured: true });
  keyPool.register({ id: `groq-gpt120b-${i+1}`, name: `Groq GPT-OSS-120B (${i+1})`, model: groq('openai/gpt-oss-120b'), supportsStructured: true });
});

// -- CEREBRAS --
// NOTE: API key returns "Not Found" for all models. Key likely expired - re-enable when renewed.
// getEnvKeys('CEREBRAS_API_KEY').forEach(...);


// -- MISTRAL --
getEnvKeys('MISTRAL_API_KEY').forEach((key, i) => {
  const mistral = createMistral({ apiKey: key });
  keyPool.register({ id: `mistral-small-${i+1}`, name: `Mistral Small (${i+1})`, model: mistral('mistral-small-latest'), supportsStructured: true });
});

// -- HUGGINGFACE --
// NOTE: HuggingFace inference routers return Bad Request for Qwen2.5 — disabled until a working endpoint is confirmed.
// getEnvKeys('HUGGINGFACE_API_KEY').forEach(...);

// -- GITHUB MODELS -- (Requires a PAT with `models:read` scope - classic tokens don't work)
// Disabled: GitHub Models requires a fine-grained PAT, not a classic token.
// To enable, create a PAT with models:read at github.com/settings/tokens
// getEnvKeys('GITHUB_MODELS_TOKEN').forEach((key, i) => { ... });

// -- SAMBANOVA --
// NOTE: All models return "Unsupported model on Response API" despite compatibility mode.
// Likely an account-level restriction. Re-enable when resolved.
// getEnvKeys('SAMBANOVA_API_KEY').forEach(...);


// -- COHERE --
getEnvKeys('COHERE_API_KEY').forEach((key, i) => {
  const cohere = createCohere({ apiKey: key });
  // Command R is optimized for RAG and tool use
  keyPool.register({ id: `cohere-command-r-${i+1}`, name: `Cohere Command R+ (${i+1})`, model: cohere('command-r-plus-08-2024'), supportsStructured: true });
});

// -- CLOUDFLARE --
// NOTE: Cloudflare Workers AI does not support json_schema structured output ("oneOf not met" error).
// Disabled until Cloudflare adds json_schema support.
// const cfToken = process.env.CLOUDFLARE_API_TOKEN;

// -- DEEPSEEK --
// NOTE: API returns "Not Found" for v4-flash and v4-pro. Key may be on old tier.
// getEnvKeys('DEEPSEEK_API_KEY').forEach(...);


// -- HYPERBOLIC --
// NOTE: API returns "Not Found" for all models. Key likely expired.
// getEnvKeys('HYPERBOLIC_API_KEY').forEach(...);


if (keyPool.size === 0) {
  console.warn('[AI Router] No API keys found! AI generation will fail.');
} else {
  console.log(`[AI Router] Loaded ${keyPool.size} models into the distributed pool.`);
}


// ------------------------------------------------------------------
// 2. SELF-HEALING ROTATION LOGIC
// ------------------------------------------------------------------

const MAX_RETRIES = 5;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateObjectWithFallback(params: Record<string, any>) {
  if ((await keyPool.getAvailableCount()) === 0) {
    throw new Error('All AI models are currently exhausted or cooling down. Please try again later.');
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const key = await keyPool.getNextKey(true);
    if (!key) break; // Exhausted all keys

    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AI Router] [Attempt ${attempt}] Routing to: ${key.name}`);
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (generateObject as any)({ ...params, model: key.model });
      
      // Success! Reset error count
      await keyPool.markSuccess(key.id);
      return result;
      
    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      console.warn(`[AI Router] ${key.name} failed: ${err.message}`);
      lastError = error;

      // Unrecoverable errors (bad prompt / bad schema) should NOT burn the key
      if (err.name === 'TypeValidationError' || err.name === 'JSONParseError') {
        throw error;
      }
      
      // Recoverable error (429, 5xx, Network) -> mark key as failed and apply cooldown backoff
      await keyPool.markFailed(key.id);
    }
  }

  console.error('[AI Router] All fallback attempts exhausted for this request.');
  throw lastError;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateTextWithFallback(params: Record<string, any>) {
  if ((await keyPool.getAvailableCount()) === 0) {
    throw new Error('All AI models are currently exhausted or cooling down. Please try again later.');
  }

  let lastError: unknown = null;

  const requiresStructured = !!params.tools || !!params.responseFormat;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const key = await keyPool.getNextKey(requiresStructured);
    if (!key) break;

    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AI Router] [Attempt ${attempt}] Routing text generation to: ${key.name}`);
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (generateText as any)({ ...params, model: key.model });
      
      await keyPool.markSuccess(key.id);
      return result;
      
    } catch (error: unknown) {
      const err = error as Error;
      console.warn(`[AI Router] ${key.name} failed: ${err.message}`);
      lastError = error;
      await keyPool.markFailed(key.id);
    }
  }

  throw lastError;
}
