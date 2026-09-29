import { generateObject, generateText, type GenerateObjectResult, type GenerateTextResult, type LanguageModel } from 'ai';
import type { ZodType } from 'zod';
import { createGoogle } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createCohere } from '@ai-sdk/cohere';
import { createOpenAI } from '@ai-sdk/openai';
import { createGroq } from '@ai-sdk/groq';
import { keyPool } from './key-pool';

// ------------------------------------------------------------------
// 1. PROVIDER REGISTRY
//
// Every provider is opt-in: it is only registered when its API key env var is set
// (`NAME`, `NAME_1`, `NAME_2`… for several keys). Lower `priority` is tried first.
//
// There are deliberately NO keyless/anonymous providers here: user CVs and prompts must
// never be sent to endpoints we have no account, terms or data-processing agreement with.
// ------------------------------------------------------------------

function getEnvKeys(baseName: string): string[] {
  const keys: string[] = [];
  const pattern = new RegExp(`^${baseName}(?:_\\d+)?$`);
  for (const [key, value] of Object.entries(process.env)) {
    if (pattern.test(key) && value && value.trim() !== '' && !value.trim().startsWith('encrypted:')) {
      keys.push(value.trim());
    }
  }
  return keys;
}

interface OpenAICompatibleProvider {
  env: string;
  id: string;
  name: string;
  baseURL: string;
  model: string;
  priority: number;
}

/** OpenAI-compatible chat endpoints. */
const OPENAI_COMPATIBLE: OpenAICompatibleProvider[] = [
  { env: 'OPENROUTER_API_KEY', id: 'openrouter-free', name: 'OpenRouter Free', baseURL: 'https://openrouter.ai/api/v1', model: 'openrouter/free', priority: 1 },
  { env: 'SAMBANOVA_API_KEY', id: 'sambanova-llama-3.3-70b', name: 'SambaNova Llama 3.3 70B', baseURL: 'https://api.sambanova.ai/v1', model: 'Meta-Llama-3.3-70B-Instruct', priority: 1 },
  { env: 'CEREBRAS_API_KEY', id: 'cerebras-gpt-oss-120b', name: 'Cerebras GPT-OSS 120B', baseURL: 'https://api.cerebras.ai/v1', model: 'gpt-oss-120b', priority: 1 },
  { env: 'DEEPSEEK_API_KEY', id: 'deepseek-chat', name: 'DeepSeek Chat', baseURL: 'https://api.deepseek.com', model: 'deepseek-chat', priority: 3 },
  { env: 'SAMBANOVA_API_KEY', id: 'sambanova-llama3', name: 'SambaNova Llama 3.1 70B', baseURL: 'https://api.sambanova.ai/v1', model: 'Meta-Llama-3.1-70B-Instruct', priority: 4 },
  { env: 'HYPERBOLIC_API_KEY', id: 'hyperbolic-llama33', name: 'Hyperbolic Llama 3.3 70B', baseURL: 'https://api.hyperbolic.xyz/v1', model: 'meta-llama/Llama-3.3-70B-Instruct', priority: 4 },
  { env: 'ZAI_API_KEY', id: 'zai-glm-4', name: 'Zhipu GLM-4', baseURL: 'https://api.z.ai/api/paas/v4/', model: 'glm-4', priority: 4 },
  { env: 'MINIMAX_API_KEY', id: 'minimax-text', name: 'MiniMax', baseURL: 'https://api.minimax.chat/v1', model: 'minimax-text-01', priority: 4 },
  { env: 'TOGETHER_API_KEY', id: 'together-llama3', name: 'Together Llama 3.3 70B', baseURL: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', priority: 4 },
  { env: 'FIREWORKS_API_KEY', id: 'fireworks-llama3', name: 'Fireworks Llama 3.1 70B', baseURL: 'https://api.fireworks.ai/inference/v1', model: 'accounts/fireworks/models/llama-v3p1-70b-instruct', priority: 4 },
  { env: 'NVIDIA_API_KEY', id: 'nvidia-llama3', name: 'NVIDIA Llama 3.1 70B', baseURL: 'https://integrate.api.nvidia.com/v1', model: 'meta/llama-3.1-70b-instruct', priority: 4 },
  { env: 'XAI_API_KEY', id: 'xai-grok', name: 'xAI Grok', baseURL: 'https://api.x.ai/v1', model: 'grok-beta', priority: 4 },
  { env: 'PERPLEXITY_API_KEY', id: 'perplexity-sonar', name: 'Perplexity Sonar', baseURL: 'https://api.perplexity.ai', model: 'llama-3.1-sonar-large-128k-chat', priority: 4 },
  { env: 'NOVITA_API_KEY', id: 'novita-llama3', name: 'Novita Llama 3.1 70B', baseURL: 'https://api.novita.ai/v3/openai', model: 'meta-llama/llama-3.1-70b-instruct', priority: 4 },
  { env: 'AI21_API_KEY', id: 'ai21-jamba', name: 'AI21 Jamba 1.5 Large', baseURL: 'https://api.ai21.com/studio/v1', model: 'jamba-1.5-large', priority: 4 },
  { env: 'LEPTON_API_KEY', id: 'lepton-llama3', name: 'Lepton Llama 3.1 70B', baseURL: 'https://llama3-1-70b.lepton.run/api/v1', model: 'llama3-1-70b', priority: 4 },
  { env: 'DASHSCOPE_API_KEY', id: 'qwen-plus', name: 'Alibaba Qwen Plus', baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', priority: 4 },
];

function registerProviders(): void {
  // Native SDK providers
  getEnvKeys('MISTRAL_API_KEY').forEach((key, i) => {
    keyPool.register({
      id: `mistral-small-${i + 1}`,
      name: `Mistral Small (${i + 1})`,
      model: createMistral({ apiKey: key })('mistral-small-latest'),
      supportsStructured: true,
      priority: 1,
    });
  });

  getEnvKeys('GOOGLE_GENERATIVE_AI_API_KEY').forEach((key, i) => {
    keyPool.register({
      id: `google-gemini-${i + 1}`,
      name: `Google Gemini 2.5 Flash (${i + 1})`,
      model: createGoogle({ apiKey: key })('gemini-2.5-flash'),
      supportsStructured: true,
      priority: 1,
    });
  });

  getEnvKeys('GROQ_API_KEY').forEach((key, i) => {
    keyPool.register({
      id: `groq-gpt-oss-120b-${i + 1}`,
      name: `Groq GPT OSS 120B (${i + 1})`,
      model: createGroq({ apiKey: key })('openai/gpt-oss-120b'),
      supportsStructured: true,
      priority: 1,
    });
  });

  getEnvKeys('COHERE_API_KEY').forEach((key, i) => {
    keyPool.register({
      id: `cohere-command-r-plus-${i + 1}`,
      name: `Cohere Command R+ (${i + 1})`,
      model: createCohere({ apiKey: key })('command-r-plus'),
      supportsStructured: true,
      priority: 4,
    });
  });

  // Cloudflare Workers AI (needs an account id as well)
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (cfAccountId) {
    const cfBase = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/v1`;
    getEnvKeys('CLOUDFLARE_API_TOKEN').forEach((key, i) => {
      const cf = createOpenAI({ apiKey: key, baseURL: cfBase });
      keyPool.register({ id: `cf-llama-3.3-70b-${i + 1}`, name: `Cloudflare Llama 3.3 70B (${i + 1})`, model: cf.chat('@cf/meta/llama-3.3-70b-instruct-fp8-fast'), supportsStructured: true, priority: 1 });
      keyPool.register({ id: `cf-qwen-coder-32b-${i + 1}`, name: `Cloudflare Qwen 2.5 Coder 32B (${i + 1})`, model: cf.chat('@cf/qwen/qwen2.5-coder-32b-instruct'), supportsStructured: true, priority: 2 });
    });
    getEnvKeys('CLOUDFLARE_AI_TOKEN').forEach((key, i) => {
      const cf = createOpenAI({ apiKey: key, baseURL: cfBase });
      keyPool.register({ id: `cloudflare-llama3-${i + 1}`, name: `Cloudflare Llama 3 8B (${i + 1})`, model: cf.chat('@cf/meta/llama-3-8b-instruct'), supportsStructured: true, priority: 5 });
    });
  }

  // OpenAI-compatible providers
  for (const p of OPENAI_COMPATIBLE) {
    getEnvKeys(p.env).forEach((key, i) => {
      keyPool.register({
        id: `${p.id}-${i + 1}`,
        name: `${p.name} (${i + 1})`,
        model: createOpenAI({ apiKey: key, baseURL: p.baseURL }).chat(p.model),
        supportsStructured: true,
        priority: p.priority,
      });
    });
  }

  // Hugging Face router (de-prioritised)
  getEnvKeys('HUGGINGFACE_API_KEY').concat(getEnvKeys('HF_API_KEY')).forEach((key, i) => {
    keyPool.register({
      id: `hf-qwen-72b-${i + 1}`,
      name: `HuggingFace Qwen 2.5 72B (${i + 1})`,
      model: createOpenAI({ apiKey: key, baseURL: 'https://router.huggingface.co/v1' })('Qwen/Qwen2.5-72B-Instruct'),
      supportsStructured: true,
      priority: 5,
    });
  });
}

registerProviders();

if (keyPool.size === 0) {
  console.warn('[AI Router] No API keys found! AI generation will fail.');
} else {
  console.log(`[AI Router] Loaded ${keyPool.size} model(s) into the pool.`);
  keyPool.restoreFromDb().catch((e) => console.error('[AI Router] Failed to restore key pool state:', e));
}

// ------------------------------------------------------------------
// 2. GENERATION WITH FALLBACK
// ------------------------------------------------------------------

export interface RouterOptions {
  /**
   * Set for user-facing request handlers. Interactive calls use few attempts, a short timeout
   * and never sleep waiting for a cooled-down key — they fail fast with AiUnavailableError.
   */
  interactive?: boolean;
  /** Override the number of provider attempts. */
  maxAttempts?: number;
  /** Override the per-attempt timeout. */
  timeoutMs?: number;
}

export class AiUnavailableError extends Error {
  constructor(message = 'AI services are currently unavailable', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AiUnavailableError';
  }
}

const BACKGROUND = { maxAttempts: 20, timeoutMs: 90_000, maxWaitMs: 10 * 60_000 };
const INTERACTIVE = { maxAttempts: 3, timeoutMs: 25_000, maxWaitMs: 0 };

function resolveOptions(o: RouterOptions = {}) {
  const base = o.interactive ? INTERACTIVE : BACKGROUND;
  return { maxAttempts: o.maxAttempts ?? base.maxAttempts, timeoutMs: o.timeoutMs ?? base.timeoutMs, maxWaitMs: base.maxWaitMs };
}

function withHardTimeout<T>(promiseFn: (signal: AbortSignal) => Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`[Timeout] ${label} exceeded ${ms}ms`));
    }, ms);

    promiseFn(controller.signal).then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

/**
 * Should this failure put the key on cooldown?
 *
 * Only provider-side faults (auth/quota/rate-limit/5xx/network/timeout) do. Errors caused by
 * the *request* (400/404/413/422, schema mismatches) must not cool a healthy key down —
 * otherwise a single malformed user request can knock the whole pool offline.
 */
export function isProviderFault(error: unknown): boolean {
  const err = error as { statusCode?: number; status?: number; cause?: { statusCode?: number }; name?: string; message?: string };
  const status = err?.statusCode ?? err?.status ?? err?.cause?.statusCode;
  if (typeof status === 'number') {
    return status === 401 || status === 402 || status === 403 || status === 408 || status === 429 || status >= 500;
  }
  const requestErrors = ['TypeValidationError', 'JSONParseError', 'NoObjectGeneratedError', 'InvalidPromptError', 'InvalidArgumentError', 'AI_TypeValidationError'];
  if (err?.name && requestErrors.includes(err.name)) return false;
  return true; // network errors, timeouts, unknown → treat as provider fault
}

async function waitForKey(structured: boolean, maxWaitMs: number): Promise<void> {
  if (keyPool.size === 0) throw new AiUnavailableError('No AI providers are configured');
  const deadline = Date.now() + maxWaitMs;
  while (!keyPool.hasAvailable(structured)) {
    if (Date.now() >= deadline) {
      throw new AiUnavailableError('All AI models are on cooldown');
    }
    console.log('[AI Router] All models are on cooldown. Waiting 60s...');
    await new Promise((r) => setTimeout(r, Math.min(60_000, Math.max(1_000, deadline - Date.now()))));
  }
}

// Native structured-output providers; others fall back to JSON mode.
const NATIVE_STRUCTURED_IDS = ['mistral-', 'google-', 'openrouter-'];
function usesJsonMode(modelId: string): boolean {
  return !NATIVE_STRUCTURED_IDS.some((prefix) => modelId.startsWith(prefix));
}

export async function generateObjectWithFallback<T = unknown>(
  params: Record<string, any> & { schema?: ZodType<T> },
  options?: RouterOptions,
): Promise<GenerateObjectResult<T>> {
  const { maxAttempts, timeoutMs, maxWaitMs } = resolveOptions(options);
  await waitForKey(true, maxWaitMs);

  let lastError: unknown = null;
  const tried = new Set<string>(); // a call never retries a key that already failed for it

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const activeKey = keyPool.getNextKey(true, tried);
    if (!activeKey) break;
    tried.add(activeKey.id);

    console.log(`[AI Router] [Attempt ${attempt}/${maxAttempts}] → ${activeKey.name}`);

    try {
      const openrouterTokenCap = activeKey.id.startsWith('openrouter-google')
        ? { maxOutputTokens: 700 }
        : activeKey.id.startsWith('openrouter-')
        ? { maxOutputTokens: 1800 }
        : {};

      const result = await withHardTimeout(
        (signal) => (generateObject as any)({
          ...params,
          model: activeKey.model,
          ...(usesJsonMode(activeKey.id) ? { mode: 'json' } : {}),
          ...openrouterTokenCap,
          abortSignal: signal,
        }),
        timeoutMs,
        activeKey.name,
      );

      keyPool.markSuccess(activeKey.id);
      return result as GenerateObjectResult<T>;
    } catch (error: unknown) {
      const err = error as Error;
      console.warn(`[AI Router] ${activeKey.name} failed (attempt ${attempt}): ${err.message?.slice(0, 120)}`);
      lastError = error;
      if (isProviderFault(error)) keyPool.markFailed(activeKey.id);
    }
  }

  console.error('[AI Router] All fallback attempts exhausted.');
  throw new AiUnavailableError('All AI fallback attempts exhausted', { cause: lastError });
}

export async function generateTextWithFallback(
  params: Record<string, any>,
  options?: RouterOptions,
): Promise<GenerateTextResult<any, any, any>> {
  const { maxAttempts, timeoutMs, maxWaitMs } = resolveOptions(options);
  const requiresStructured = !!params.tools || !!params.responseFormat;
  await waitForKey(requiresStructured, maxWaitMs);

  let lastError: unknown = null;
  const tried = new Set<string>();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const activeKey = keyPool.getNextKey(requiresStructured, tried);
    if (!activeKey) break;
    tried.add(activeKey.id);

    console.log(`[AI Router] [Text][Attempt ${attempt}/${maxAttempts}] → ${activeKey.name}`);

    try {
      const result = await withHardTimeout(
        (signal) => (generateText as any)({ ...params, model: activeKey.model, abortSignal: signal }),
        timeoutMs,
        activeKey.name,
      );
      keyPool.markSuccess(activeKey.id);
      return result as GenerateTextResult<any, any, any>;
    } catch (error: unknown) {
      const err = error as Error;
      console.warn(`[AI Router] ${activeKey.name} failed: ${err.message?.slice(0, 120)}`);
      lastError = error;
      if (isProviderFault(error)) keyPool.markFailed(activeKey.id);
    }
  }

  throw new AiUnavailableError('All AI fallback attempts exhausted', { cause: lastError });
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
  model: LanguageModel;
  /** Accepts application/pdf as a file part (image-only models do not). */
  supportsPdf: boolean;
}

export { keyPool };

function getVisionModelPool(): VisionModelCandidate[] {
  const pool: VisionModelCandidate[] = [];

  getEnvKeys('MISTRAL_API_KEY').forEach((key, i) => {
    pool.push({
      id: `mistral-pixtral-${i + 1}`,
      name: `Mistral Pixtral 12B (${i + 1})`,
      model: createMistral({ apiKey: key })('pixtral-12b-2409'),
      supportsPdf: false,
    });
  });

  const googleKeys = [...getEnvKeys('GOOGLE_GENERATIVE_AI_API_KEY'), ...getEnvKeys('GEMINI_API_KEY')];
  Array.from(new Set(googleKeys)).forEach((key, i) => {
    pool.push({
      id: `google-vision-${i + 1}`,
      name: `Google Gemini 2.5 Flash Vision (${i + 1})`,
      model: createGoogle({ apiKey: key })('gemini-2.5-flash'),
      supportsPdf: true,
    });
  });

  return pool;
}

/**
 * OCR / reading of an image or a PDF through vision-capable models only.
 * Pass `mediaType: 'application/pdf'` for PDFs (only PDF-capable models are used).
 */
export async function extractVisionTextWithFallback(
  fileBuffer: Buffer,
  prompt: string,
  mediaType?: string,
): Promise<string> {
  const type = mediaType ?? detectImageMimeType(fileBuffer);
  const visionModels = getVisionModelPool().filter((c) => type !== 'application/pdf' || c.supportsPdf);

  if (visionModels.length === 0) {
    console.warn('[Vision Router] No Vision-capable API keys configured.');
    return '';
  }

  for (const candidate of visionModels) {
    try {
      console.log(`[Vision Router] Attempting vision OCR with ${candidate.name}...`);
      const { text } = await withHardTimeout(
        (signal) => generateText({
          model: candidate.model,
          abortSignal: signal,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'file', data: fileBuffer, mediaType: type },
              ],
            },
          ],
        } as any),
        type === 'application/pdf' ? 60_000 : 35_000,
        candidate.name,
      ) as { text: string };

      if (text && text.trim().length > 30) {
        console.log(`[Vision Router] ${candidate.name} successfully extracted ${text.length} chars.`);
        return text.trim();
      }
    } catch (err) {
      console.warn(`[Vision Router] ${candidate.name} failed:`, (err as Error).message?.slice(0, 120));
    }
  }

  console.error('[Vision Router] All vision fallback models exhausted.');
  return '';
}
