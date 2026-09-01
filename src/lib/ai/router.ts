import { generateObject, generateText, type GenerateObjectResult } from 'ai';
import type { ZodType } from 'zod';
import { createGoogle } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createCohere } from '@ai-sdk/cohere';
import { createOpenAI } from '@ai-sdk/openai';
import { createGroq } from '@ai-sdk/groq';
import { keyPool } from './key-pool';

// ------------------------------------------------------------------
// 1. DYNAMIC PROVIDER LOADER
// ------------------------------------------------------------------

function getEnvKeys(baseName: string): string[] {
  const keys: string[] = [];
  const pattern = new RegExp(\`^\${baseName}(?:_\\\\d+)?$\`);
  for (const [key, value] of Object.entries(process.env)) {
    if (pattern.test(key) && value && value.trim() !== '' && !value.trim().startsWith('encrypted:')) {
      keys.push(value.trim());
    }
  }
  return keys;
}

// ── PRIORITY 1: MISTRAL ──────────────────────────────────────────────────
getEnvKeys('MISTRAL_API_KEY').forEach((key, i) => {
  const mistral = createMistral({ apiKey: key });
  keyPool.register({
    id: \`mistral-small-\${i + 1}\`,
    name: \`Mistral Small (\${i + 1})\`,
    model: mistral('mistral-small-latest'),
    supportsStructured: true,
    priority: 1,
  });
});

// ── PRIORITY 2: GOOGLE GEMINI (Region blocked on Linode, but fallback) ────
getEnvKeys('GOOGLE_GENERATIVE_AI_API_KEY').forEach((key, i) => {
  const google = createGoogle({ apiKey: key });
  keyPool.register({
    id: \`google-gemini-\${i + 1}\`,
    name: \`Google Gemini 2.5 Flash (\${i + 1})\`,
    model: google('gemini-2.5-flash'),
    supportsStructured: true,
    priority: 2,
  });
});

// ── PRIORITY 2: OPENROUTER ────────────────────────────────────────────────
getEnvKeys('OPENROUTER_API_KEY').forEach((key, i) => {
  const openrouter = createOpenAI({ apiKey: key, baseURL: 'https://openrouter.ai/api/v1' });
  keyPool.register({
    id: \`openrouter-google-gemini-2.5-flash-\${i + 1}\`,
    name: \`OpenRouter Gemini 2.5 Flash (\${i + 1})\`,
    model: openrouter('google/gemini-2.5-flash'),
    supportsStructured: true,
    priority: 2,
  });
});

if (keyPool.size === 0) {
  console.warn('[AI Router] No API keys found! AI generation will fail.');
} else {
  console.log(\`[AI Router] Loaded \${keyPool.size} model(s) into the pool.\`);
  keyPool.restoreFromDb().catch(e => console.error('[AI Router] Failed to restore key pool state:', e));
}

// ------------------------------------------------------------------
// 2. GENERATION WITH FALLBACK
// ------------------------------------------------------------------

const MAX_RETRIES = 6;
const AI_TIMEOUT_MS = 90_000;

function withHardTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(\`[Timeout] \${label} exceeded \${ms}ms\`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

const NATIVE_STRUCTURED_IDS = [
  'mistral-',
  'google-',
  'openrouter-',
];
function usesJsonMode(modelId: string): boolean {
  return !NATIVE_STRUCTURED_IDS.some(prefix => modelId.startsWith(prefix));
}

function usesTextModeFallback(modelId: string): boolean {
  return false; // All current models support native objects or JSON mode
}

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
      await new Promise(r => setTimeout(r, 5000));
      activeKey = keyPool.getNextKey(true);
      if (!activeKey) break;
    }

    console.log(\`[AI Router] [Attempt \${attempt}/\${MAX_RETRIES}] → \${activeKey.name}\`);

    try {
      let result;
      const openrouterTokenCap = activeKey.id.startsWith('openrouter-google')
        ? { maxTokens: 700 }
        : activeKey.id.startsWith('openrouter-')
        ? { maxTokens: 1800 }
        : {};
      
      result = await withHardTimeout(
        (generateObject as any)({
          ...params,
          model: activeKey.model,
          ...(usesJsonMode(activeKey.id) ? { mode: 'json' } : {}),
          ...openrouterTokenCap,
        }),
        AI_TIMEOUT_MS,
        activeKey.name,
      );

      keyPool.markSuccess(activeKey.id);
      return result as GenerateObjectResult<T>;

    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      console.warn(\`[AI Router] \${activeKey.name} failed (attempt \${attempt}): \${err.message?.slice(0, 120)}\`);
      lastError = error;
      if (err.name === 'TypeValidationError' || err.name === 'JSONParseError' || err.message?.includes('No object generated')) {
        continue;
      }
      keyPool.markFailed(activeKey.id);
    }
  }

  console.error('[AI Router] All fallback attempts exhausted.');
  throw lastError ?? new Error('[AI Router] All fallback attempts exhausted with no specific error.');
}

export async function generateTextWithFallback(params: Record<string, any>) {
  if (keyPool.getAvailableCount() === 0) {
    throw new Error('[AI Router] All models are on cooldown. Try again in a moment.');
  }

  let lastError: unknown = null;
  const requiresStructured = !!params.tools || !!params.responseFormat;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const activeKey = keyPool.getNextKey(requiresStructured);
    if (!activeKey) break;

    console.log(\`[AI Router] [Text][Attempt \${attempt}/\${MAX_RETRIES}] → \${activeKey.name}\`);

    try {
      const result = await withHardTimeout(
        (generateText as any)({ ...params, model: activeKey.model }),
        AI_TIMEOUT_MS,
        activeKey.name,
      );
      keyPool.markSuccess(activeKey.id);
      return result;

    } catch (error: unknown) {
      const err = error as Error;
      console.warn(\`[AI Router] \${activeKey.name} failed: \${err.message?.slice(0, 120)}\`);
      lastError = error;
      keyPool.markFailed(activeKey.id);
    }
  }

  throw lastError ?? new Error('[AI Router] Unknown failure');
}

// ------------------------------------------------------------------
// 3. VISION EXTRACTION WITH MULTI-PROVIDER FALLBACK
// ------------------------------------------------------------------

function detectImageMimeType(buf: Buffer): string {
  if (!buf || buf.length < 4) return 'image/jpeg';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif';
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) return 'image/webp';
  return 'image/jpeg';
}

interface VisionModelCandidate {
  id: string;
  name: string;
  model: any;
}

function getVisionModelPool(): VisionModelCandidate[] {
  const pool: VisionModelCandidate[] = [];

  getEnvKeys('MISTRAL_API_KEY').forEach((key, i) => {
    const mistral = createMistral({ apiKey: key });
    pool.push({
      id: \`mistral-pixtral-\${i + 1}\`,
      name: \`Mistral Pixtral 12B (\${i + 1})\`,
      model: mistral('pixtral-12b-2409'),
    });
  });

  const googleKeys = [...getEnvKeys('GOOGLE_GENERATIVE_AI_API_KEY'), ...getEnvKeys('GEMINI_API_KEY')];
  Array.from(new Set(googleKeys)).forEach((key, i) => {
    const makeGoogle = createGoogle({ apiKey: key });
    pool.push({
      id: \`google-vision-\${i + 1}\`,
      name: \`Google Gemini 2.5 Flash Vision (\${i + 1})\`,
      model: makeGoogle('gemini-2.5-flash'),
    });
  });

  return pool;
}

export async function extractVisionTextWithFallback(
  imageBuffer: Buffer,
  prompt: string,
): Promise<string> {
  const visionModels = getVisionModelPool();

  if (visionModels.length === 0) {
    console.warn('[Vision Router] No Vision-capable API keys configured.');
    return '';
  }

  const mimeType = detectImageMimeType(imageBuffer);
  let lastError: unknown = null;

  for (const candidate of visionModels) {
    try {
      console.log(\`[Vision Router] Attempting vision OCR with \${candidate.name}...\`);
      const { text } = await withHardTimeout(
        generateText({
          model: candidate.model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'file', data: imageBuffer, mediaType: mimeType, mimeType: mimeType } as any,
              ],
            },
          ],
        }),
        35_000,
        candidate.name,
      );

      if (text && text.trim().length > 30) {
        console.log(\`[Vision Router] \${candidate.name} successfully extracted \${text.length} chars.\`);
        return text.trim();
      }
    } catch (err) {
      console.warn(\`[Vision Router] \${candidate.name} failed:\`, (err as Error).message?.slice(0, 120));
      lastError = err;
    }
  }

  console.error('[Vision Router] All vision fallback models exhausted.');
  return '';
}
