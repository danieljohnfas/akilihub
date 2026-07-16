import { generateObject, generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createGroq } from '@ai-sdk/groq';
import { createMistral } from '@ai-sdk/mistral';
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
getEnvKeys('OPENROUTER_API_KEY').forEach((key, i) => {
  const or = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: key,
    headers: { 'HTTP-Referer': 'https://akilibrain.com', 'X-Title': 'AkiliBrain' }
  });
  keyPool.register({ id: `or-gemma2-${i+1}`, name: `OpenRouter Gemma-2-9b (${i+1})`, model: or('google/gemma-2-9b-it:free'), supportsStructured: true });
  keyPool.register({ id: `or-llama3-${i+1}`, name: `OpenRouter Llama-3.1-8b (${i+1})`, model: or('meta-llama/llama-3.1-8b-instruct:free'), supportsStructured: true });
});

// -- GROQ --
getEnvKeys('GROQ_API_KEY').forEach((key, i) => {
  const groq = createGroq({ apiKey: key });
  // Llama 3.3 70B is excellent for structured extraction
  keyPool.register({ id: `groq-llama33-${i+1}`, name: `Groq Llama-3.3-70B (${i+1})`, model: groq('llama-3.3-70b-versatile'), supportsStructured: true });
  keyPool.register({ id: `groq-gemma2-${i+1}`, name: `Groq Gemma2-9b (${i+1})`, model: groq('gemma2-9b-it'), supportsStructured: true });
});

// -- CEREBRAS --
getEnvKeys('CEREBRAS_API_KEY').forEach((key, i) => {
  const cerebras = createOpenAI({
    baseURL: 'https://api.cerebras.ai/v1',
    apiKey: key,
  });
  keyPool.register({ id: `cerebras-llama33-${i+1}`, name: `Cerebras Llama-3.3-70B (${i+1})`, model: cerebras('llama3.1-8b'), supportsStructured: true });
});

// -- MISTRAL --
getEnvKeys('MISTRAL_API_KEY').forEach((key, i) => {
  const mistral = createMistral({ apiKey: key });
  keyPool.register({ id: `mistral-small-${i+1}`, name: `Mistral Small (${i+1})`, model: mistral('mistral-small-latest'), supportsStructured: true });
});

// -- HUGGINGFACE --
getEnvKeys('HUGGINGFACE_API_KEY').forEach((key, i) => {
  // HuggingFace exposes an OpenAI compatible endpoint
  const hf = createOpenAI({
    baseURL: 'https://api-inference.huggingface.co/v1/',
    apiKey: key,
  });
  keyPool.register({ id: `hf-qwen2-${i+1}`, name: `HuggingFace Qwen2.5-72B (${i+1})`, model: hf('Qwen/Qwen2.5-72B-Instruct'), supportsStructured: true });
});

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
  if (keyPool.availableCount === 0) {
    throw new Error('All AI models are currently exhausted or cooling down. Please try again later.');
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const key = keyPool.getNextKey(true);
    if (!key) break; // Exhausted all keys

    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AI Router] [Attempt ${attempt}] Routing to: ${key.name}`);
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (generateObject as any)({ ...params, model: key.model });
      
      // Success! Reset error count
      keyPool.markSuccess(key.id);
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
      keyPool.markFailed(key.id);
    }
  }

  console.error('[AI Router] All fallback attempts exhausted for this request.');
  throw lastError;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateTextWithFallback(params: Record<string, any>) {
  if (keyPool.availableCount === 0) {
    throw new Error('All AI models are currently exhausted or cooling down. Please try again later.');
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const key = keyPool.getNextKey(false);
    if (!key) break;

    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AI Router] [Attempt ${attempt}] Routing text generation to: ${key.name}`);
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (generateText as any)({ ...params, model: key.model });
      
      keyPool.markSuccess(key.id);
      return result;
      
    } catch (error: unknown) {
      const err = error as Error;
      console.warn(`[AI Router] ${key.name} failed: ${err.message}`);
      lastError = error;
      keyPool.markFailed(key.id);
    }
  }

  throw lastError;
}
