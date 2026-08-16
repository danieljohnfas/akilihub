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

// Helper: extract all env vars starting with baseName (supports _2, _3, etc.)
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

// ── PRIORITY 1: SAMBANOVA CLOUD ───────────────────────────────────────────────
// Fast inference via SambaNova Cloud (Llama 3.3 70B)
getEnvKeys('SAMBANOVA_API_KEY').forEach((key, i) => {
  const sambanova = createOpenAI({
    apiKey: key,
    baseURL: 'https://api.sambanova.ai/v1',
  });
  keyPool.register({
    id: `sambanova-llama-${i + 1}`,
    name: `SambaNova Llama 3.3 70B (${i + 1})`,
    model: sambanova('Meta-Llama-3.3-70B-Instruct'),
    supportsStructured: true,
    priority: 1,
  });
});


// ── PRIORITY 1: GROQ (Llama 3.3 70B) ────────────────────────────────────────
// 14,400 req/day free · fastest inference (~0.8s) · full JSON schema support
getEnvKeys('GROQ_API_KEY').forEach((key, i) => {
  const groq = createGroq({ apiKey: key });
  keyPool.register({
    id: `groq-llama-${i + 1}`,
    name: `Groq Llama 3.3 70B (${i + 1})`,
    model: groq('llama-3.3-70b-versatile'),
    supportsStructured: true, // We fallback to json mode for Groq
    priority: 1,
  });
});

// ── PRIORITY 2: MISTRAL (Small) ───────────────────────────────────────────────
// Free tier · native JSON schema · fast
getEnvKeys('MISTRAL_API_KEY').forEach((key, i) => {
  const mistral = createMistral({ apiKey: key });
  keyPool.register({
    id: `mistral-small-${i + 1}`,
    name: `Mistral Small (${i + 1})`,
    model: mistral('mistral-small-latest'),
    supportsStructured: true,
    priority: 2,
  });
});

// ── PRIORITY 3: GOOGLE (Gemini 2.5 Flash) ────────────────────────────────────
// 1,500 req/day free · confirmed working · reliable structured output
getEnvKeys('GOOGLE_GENERATIVE_AI_API_KEY').forEach((key, i) => {
  const makeGoogle = createGoogle({ apiKey: key });
  keyPool.register({
    id: `google-flash-${i + 1}`,
    name: `Google Gemini 2.5 Flash (${i + 1})`,
    model: makeGoogle('gemini-2.5-flash'),
    supportsStructured: true,
    priority: 3,
  });
});

// (Removed duplicate Cerebras and SambaNova blocks)

// ── PRIORITY 6: OPENROUTER (multi-model pool) ─────────────────────────────────
// 50 req/day free · routes to best available model automatically
getEnvKeys('OPENROUTER_API_KEY').forEach((key, i) => {
  const openrouter = createOpenAI({
    apiKey: key,
    baseURL: 'https://openrouter.ai/api/v1',
  });
  keyPool.register({
    id: `openrouter-free-${i + 1}`,
    name: `OpenRouter Free (${i + 1})`,
    model: openrouter('openrouter/free'),
    supportsStructured: true, // openrouter/free supports JSON schema!
    priority: 6,
  });
});

// ── PRIORITY 7: NVIDIA (Nemotron) ───────────────────────────────────────────
// High quality model hosted on NVIDIA's free/paid API endpoints
getEnvKeys('NVIDIA_API_KEY').forEach((key, i) => {
  const nvidia = createOpenAI({
    apiKey: key,
    baseURL: 'https://integrate.api.nvidia.com/v1',
  });
  keyPool.register({
    id: `nvidia-nemotron-${i + 1}`,
    name: `NVIDIA Nemotron 70B (${i + 1})`,
    model: nvidia('nvidia/llama-3.1-nemotron-70b-instruct'),
    supportsStructured: true, // OpenAI compatible endpoint supports structured
    priority: 7,
  });
});

// ── PRIORITY 8: DEEPSEEK ──────────────────────────────────────────────────────
// OpenAI-compatible · affordable · strong reasoning
getEnvKeys('DEEPSEEK_API_KEY').forEach((key, i) => {
  const deepseek = createOpenAI({
    apiKey: key,
    baseURL: 'https://api.deepseek.com/v1',
  });
  keyPool.register({
    id: `deepseek-chat-${i + 1}`,
    name: `DeepSeek Chat (${i + 1})`,
    model: deepseek('deepseek-chat'),
    supportsStructured: true,
    priority: 7,
  });
});

// ── PRIORITY 8: HUGGING FACE (Llama 3.3 70B Instruct) ───────────────────────
// Free serverless inference · OpenAI-compatible
getEnvKeys('HUGGINGFACE_API_KEY').forEach((key, i) => {
  const hf = createOpenAI({
    apiKey: key,
    baseURL: 'https://router.huggingface.co/v1',
  });
  keyPool.register({
    id: `huggingface-llama-${i + 1}`,
    name: `HuggingFace Llama 3.3 70B (${i + 1})`,
    model: hf('meta-llama/Llama-3.3-70B-Instruct'),
    supportsStructured: false,
    priority: 8,
  });
});

// ── PRIORITY 9: COHERE (Command R+) ──────────────────────────────────────────
// Fallback — trial key may be exhausted; kept for redundancy
getEnvKeys('COHERE_API_KEY').forEach((key, i) => {
  const cohere = createCohere({ apiKey: key });
  keyPool.register({
    id: `cohere-command-r-${i + 1}`,
    name: `Cohere Command R+ (${i + 1})`,
    model: cohere('command-r-plus-08-2024'),
    supportsStructured: true,
    priority: 9,
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

const MAX_RETRIES = 6; // More retries now that we have more models
const AI_TIMEOUT_MS = 90_000;

function withHardTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`[Timeout] ${label} exceeded ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

// Models that support native JSON schema structured output
const NATIVE_STRUCTURED_IDS = ['google-', 'mistral-', 'cohere-', 'cerebras-', 'deepseek-', 'github-', 'nvidia-', 'openrouter-'];
function usesJsonMode(modelId: string): boolean {
  return !NATIVE_STRUCTURED_IDS.some(prefix => modelId.startsWith(prefix));
}

export async function generateObjectWithFallback<T = unknown>(
  params: Record<string, any> & { schema?: ZodType<T> }
): Promise<GenerateObjectResult<T>> {
  if (keyPool.getAvailableCount() === 0) {
    throw new Error('[AI Router] All models are on cooldown. Try again in a moment.');
  }

  const lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let activeKey = keyPool.getNextKey(true);
    if (!activeKey) {
      await new Promise(r => setTimeout(r, 5000));
      activeKey = keyPool.getNextKey(true);
      if (!activeKey) break;
    }

    console.log(`[AI Router] [Attempt ${attempt}/${MAX_RETRIES}] → ${activeKey.name}`);

    try {
      let result;
      if (activeKey.id.startsWith('sambanova-') || activeKey.id.startsWith('groq-')) {
        const textResult = await withHardTimeout(
          (generateText as any)({
            ...params,
            model: activeKey.model,
            prompt: (params.prompt || '') + `\n\nCRITICAL INSTRUCTION: You MUST return ONLY a valid JSON object. Do not include any explanations, preambles, or markdown formatting like \`\`\`json. Start the response directly with { and end it with }.`
          }),
          AI_TIMEOUT_MS,
          activeKey.name,
        );
        let text = textResult.text.trim();
        if (text.startsWith('```json')) text = text.replace(/^```json/g, '').replace(/```$/g, '').trim();
        if (text.startsWith('```')) text = text.replace(/^```/g, '').replace(/```$/g, '').trim();
        try {
          result = { object: JSON.parse(text), usage: textResult.usage };
        } catch (e) {
          throw new Error(`Failed to parse JSON from ${activeKey.name}: ${text.substring(0, 100)}...`);
        }
      } else {
        result = await withHardTimeout(
          (generateObject as any)({
            ...params,
            model: activeKey.model,
            ...(usesJsonMode(activeKey.id) ? { mode: 'json' } : {}),
          }),
          AI_TIMEOUT_MS,
          activeKey.name,
        );
      }

      keyPool.markSuccess(activeKey.id);
      return result as GenerateObjectResult<T>;

    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      console.warn(`[AI Router] ${activeKey.name} failed (attempt ${attempt}): ${err.message?.slice(0, 120)}`);
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

    console.log(`[AI Router] [Text][Attempt ${attempt}/${MAX_RETRIES}] → ${activeKey.name}`);

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
      console.warn(`[AI Router] ${activeKey.name} failed: ${err.message?.slice(0, 120)}`);
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

  // 1. Google Gemini (2.5 Flash) — best vision quality
  const googleKeys = [
    ...getEnvKeys('GOOGLE_GENERATIVE_AI_API_KEY'),
    ...getEnvKeys('GEMINI_API_KEY'),
  ];
  Array.from(new Set(googleKeys)).forEach((key, i) => {
    const makeGoogle = createGoogle({ apiKey: key });
    pool.push({
      id: `google-vision-${i + 1}`,
      name: `Google Gemini 2.5 Flash Vision (${i + 1})`,
      model: makeGoogle('gemini-2.5-flash'),
    });
  });

  // 2. DeepSeek (vision via chat — partial support)
  getEnvKeys('DEEPSEEK_API_KEY').forEach((key, i) => {
    const deepseek = createOpenAI({ apiKey: key, baseURL: 'https://api.deepseek.com/v1' });
    pool.push({
      id: `deepseek-vision-${i + 1}`,
      name: `DeepSeek Vision (${i + 1})`,
      model: deepseek('deepseek-chat'),
    });
  });

  // 3. Mistral Pixtral (vision specialist)
  getEnvKeys('MISTRAL_API_KEY').forEach((key, i) => {
    const mistral = createMistral({ apiKey: key });
    pool.push({
      id: `mistral-pixtral-${i + 1}`,
      name: `Mistral Pixtral 12B (${i + 1})`,
      model: mistral('pixtral-12b-2409'),
    });
  });

  return pool;
}

/**
 * Executes multimodal vision OCR across the AI roster with multi-model fallback.
 */
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
      console.log(`[Vision Router] Attempting vision OCR with ${candidate.name}...`);
      const { text } = await withHardTimeout(
        generateText({
          model: candidate.model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'file',
                  data: imageBuffer,
                  mediaType: mimeType,
                  mimeType: mimeType,
                } as any,
              ],
            },
          ],
        }),
        35_000,
        candidate.name,
      );

      if (text && text.trim().length > 30) {
        console.log(`[Vision Router] ${candidate.name} successfully extracted ${text.length} chars.`);
        return text.trim();
      }
    } catch (err) {
      console.warn(`[Vision Router] ${candidate.name} failed:`, (err as Error).message?.slice(0, 120));
      lastError = err;
    }
  }

  console.error('[Vision Router] All vision fallback models exhausted.');
  return '';
}
