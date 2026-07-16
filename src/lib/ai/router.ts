import { generateObject, generateText, LanguageModel } from 'ai';
import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

// 1. Initialize Providers
const openRouter = process.env.OPENROUTER_API_KEY ? createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': 'https://akilibrain.com',
    'X-Title': 'AkiliBrain Scraper',
  }
}) : null;

const hasGoogle = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;

// 2. Define our pool of highly capable, free-tier models as named pairs
type NamedModel = { name: string; model: LanguageModel };
const modelPool: NamedModel[] = [];

// Prioritize OpenRouter free models to save Google credits
if (openRouter) {
  modelPool.push({ name: 'openrouter/gemma-2-9b-it:free',         model: openRouter('google/gemma-2-9b-it:free') });
  modelPool.push({ name: 'openrouter/llama-3.1-8b-instruct:free', model: openRouter('meta-llama/llama-3.1-8b-instruct:free') });
  modelPool.push({ name: 'openrouter/mistral-7b-instruct:free',   model: openRouter('mistralai/mistral-7b-instruct:free') });
}

if (hasGoogle) {
  modelPool.push({ name: 'google/gemini-2.5-flash', model: google('gemini-2.5-flash') });
}

if (modelPool.length === 0) {
  console.warn('[AI Router] No API keys found for Google or OpenRouter. AI generation will fail.');
}

/**
 * Enhanced generateObject that attempts multiple models in sequence.
 * If a model fails (rate limit 429, server error 5xx, etc.) it retries with the next model.
 *
 * We cast to `any` internally to work around TypeScript's inability to resolve
 * the heavily-overloaded `generateObject` signature when spreading params at runtime.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateObjectWithFallback(params: Record<string, any>) {
  if (modelPool.length === 0) {
    throw new Error('No AI models available. Check your API keys.');
  }

  let lastError: unknown = null;

  for (const { name, model } of modelPool) {
    try {
      console.log(`[AI Router] Attempting generateObject with: ${name}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (generateObject as any)({ ...params, model });
    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      console.warn(`[AI Router] ${name} failed: ${err.message}`);
      lastError = error;

      // Zod / JSON parse errors won't be fixed by switching models — rethrow immediately
      if (err.name === 'TypeValidationError' || err.name === 'JSONParseError') {
        throw error;
      }
      // Otherwise (429, 5xx, network) fall through to the next model
    }
  }

  console.error('[AI Router] All fallback models exhausted.');
  throw lastError;
}

/**
 * Enhanced generateText that attempts multiple models in sequence.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateTextWithFallback(params: Record<string, any>) {
  if (modelPool.length === 0) {
    throw new Error('No AI models available. Check your API keys.');
  }

  let lastError: unknown = null;

  for (const { name, model } of modelPool) {
    try {
      console.log(`[AI Router] Attempting generateText with: ${name}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (generateText as any)({ ...params, model });
    } catch (error: unknown) {
      const err = error as Error;
      console.warn(`[AI Router] ${name} failed: ${err.message}`);
      lastError = error;
    }
  }

  console.error('[AI Router] All fallback models exhausted.');
  throw lastError;
}
