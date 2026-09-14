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
  const pattern = new RegExp(`^${baseName}(?:_\\d+)?$`);
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
    id: `mistral-small-${i + 1}`,
    name: `Mistral Small (${i + 1})`,
    model: mistral('mistral-small-latest'),
    supportsStructured: true,
    priority: 1,
  });
});

// 🚀 PRIORITY 1: CLOUDFLARE WORKERS AI
  getEnvKeys('CLOUDFLARE_API_TOKEN').forEach((key, i) => {
    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    if (cfAccountId) {
      const cf = createOpenAI({
        apiKey: key,
        baseURL: `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/v1`
      });
      keyPool.register({
        id: `cf-llama-3.3-70b-${i + 1}`,
        name: `Cloudflare Llama 3.3 70B (${i + 1})`,
        model: cf.chat('@cf/meta/llama-3.3-70b-instruct-fp8-fast'),
        supportsStructured: false,
        priority: 1, 
      });
      keyPool.register({
        id: `cf-qwen-coder-32b-${i + 1}`,
        name: `Cloudflare Qwen 2.5 Coder 32B (${i + 1})`,
        model: cf.chat('@cf/qwen/qwen2.5-coder-32b-instruct'),
        supportsStructured: false,
        priority: 2, 
      });
    }
  });

// 🚀 PRIORITY 3: GOOGLE GEMINI (Region blocked on Linode, but fallback) 🚀────
getEnvKeys('GOOGLE_GENERATIVE_AI_API_KEY').forEach((key, i) => {
  const google = createGoogle({ apiKey: key });
  keyPool.register({
    id: `google-gemini-${i + 1}`,
    name: `Google Gemini 2.5 Flash (${i + 1})`,
    model: google('gemini-2.5-flash'),
    supportsStructured: true,
    priority: 2,
  });
});

// ── PRIORITY 2: OPENROUTER ────────────────────────────────────────────────// 🚀 PRIORITY 4: OPENROUTER (Gemini 2.5 Flash Free)
  getEnvKeys('OPENROUTER_API_KEY').forEach((key, i) => {
    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: key,
    });
    keyPool.register({
      id: `openrouter-free-${i + 1}`,
      name: `OpenRouter Free (${i + 1})`,
      model: openrouter.chat('openrouter/free'),
      supportsStructured: true,
      priority: 1, // SET PRIORITY HIGH BECAUSE IT'S FREE
    });
  });

// 🚀 PRIORITY 3: GROQ
getEnvKeys('GROQ_API_KEY').forEach((key, i) => {
  const groq = createGroq({ apiKey: key });
  keyPool.register({
    id: `groq-gpt-oss-120b-${i + 1}`,
    name: `Groq GPT OSS 120B (${i + 1})`,
    model: groq('openai/gpt-oss-120b'),
    supportsStructured: false,
    priority: 0, 
  });
});

// 🚀 PRIORITY 1: SAMBANOVA
  getEnvKeys('SAMBANOVA_API_KEY').forEach((key, i) => {
    const sambanova = createOpenAI({
      baseURL: 'https://api.sambanova.ai/v1',
      apiKey: key,
    });
    keyPool.register({
      id: `sambanova-llama-3.3-70b-${i + 1}`,
      name: `SambaNova Llama 3.3 70B (${i + 1})`,
      model: sambanova.chat('Meta-Llama-3.3-70B-Instruct'),
      supportsStructured: true,
      priority: 1, 
    });
  });

// 🚀 PRIORITY 1: CEREBRAS (Ultra fast)
  getEnvKeys('CEREBRAS_API_KEY').forEach((key, i) => {
    const cerebras = createOpenAI({
      baseURL: 'https://api.cerebras.ai/v1',
      apiKey: key,
    });
    keyPool.register({
      id: `cerebras-gpt-oss-120b-${i + 1}`,
      name: `Cerebras GPT OSS 120B (${i + 1})`,
      model: cerebras.chat('gpt-oss-120b'),
      supportsStructured: false,
      priority: 0, 
    });
  });

// ── PRIORITY 3: DEEPSEEK ────────────────────────────────────────────────
getEnvKeys('DEEPSEEK_API_KEY').forEach((key, i) => {
  const deepseek = createOpenAI({ apiKey: key, baseURL: 'https://api.deepseek.com' });
  keyPool.register({
    id: `deepseek-chat-${i + 1}`,
    name: `DeepSeek Chat (${i + 1})`,
    model: deepseek.chat('deepseek-chat'),
    supportsStructured: true,
    priority: 3,
  });
});

// ── PRIORITY 4: SAMBANOVA ────────────────────────────────────────────────
getEnvKeys('SAMBANOVA_API_KEY').forEach((key, i) => {
  const sambanova = createOpenAI({ apiKey: key, baseURL: 'https://api.sambanova.ai/v1' });
  keyPool.register({
    id: `sambanova-llama3-${i + 1}`,
    name: `SambaNova Llama 3.1 70B (${i + 1})`,
    model: sambanova.chat('Meta-Llama-3.1-70B-Instruct'),
    supportsStructured: true,
    priority: 4,
  });
});

// ── PRIORITY 4: COHERE ────────────────────────────────────────────────
getEnvKeys('COHERE_API_KEY').forEach((key, i) => {
  const cohere = createCohere({ apiKey: key });
  keyPool.register({
    id: `cohere-command-r-plus-${i + 1}`,
    name: `Cohere Command R+ (${i + 1})`,
    model: cohere('command-r-plus'),
    supportsStructured: true,
    priority: 4,
  });
});

// ── PRIORITY 4: HYPERBOLIC ────────────────────────────────────────────────
getEnvKeys('HYPERBOLIC_API_KEY').forEach((key, i) => {
  const hyperbolic = createOpenAI({ apiKey: key, baseURL: 'https://api.hyperbolic.xyz/v1' });
  keyPool.register({
    id: `hyperbolic-llama3-${i + 1}`,
    name: `Hyperbolic Llama 3.1 70B (${i + 1})`,
    model: hyperbolic.chat('meta-llama/Meta-Llama-3.1-70B-Instruct'),
    supportsStructured: true,
    priority: 4,
  });
});

// ── PRIORITY 4: MINIMAX ────────────────────────────────────────────────
getEnvKeys('MINIMAX_API_KEY').forEach((key, i) => {
  const minimax = createOpenAI({ apiKey: key, baseURL: 'https://api.minimax.chat/v1' });
  keyPool.register({
    id: `minimax-text-${i + 1}`,
    name: `MiniMax (${i + 1})`,
    model: minimax.chat('minimax-text-01'),
    supportsStructured: true,
    priority: 4,
  });
});

// ── PRIORITY 4: TOGETHER AI ────────────────────────────────────────────────
getEnvKeys('TOGETHER_API_KEY').forEach((key, i) => {
  const together = createOpenAI({ apiKey: key, baseURL: 'https://api.together.xyz/v1' });
  keyPool.register({
    id: `together-llama3-${i + 1}`,
    name: `Together Llama 3.3 70B (${i + 1})`,
    model: together('meta-llama/Llama-3.3-70B-Instruct-Turbo'),
    supportsStructured: true,
    priority: 4,
  });
});

// ── PRIORITY 4: FIREWORKS AI ────────────────────────────────────────────────
getEnvKeys('FIREWORKS_API_KEY').forEach((key, i) => {
  const fireworks = createOpenAI({ apiKey: key, baseURL: 'https://api.fireworks.ai/inference/v1' });
  keyPool.register({
    id: `fireworks-llama3-${i + 1}`,
    name: `Fireworks Llama 3.1 70B (${i + 1})`,
    model: fireworks('accounts/fireworks/models/llama-v3p1-70b-instruct'),
    supportsStructured: true,
    priority: 4,
  });
});

// ── PRIORITY 4: NVIDIA NIM ────────────────────────────────────────────────
getEnvKeys('NVIDIA_API_KEY').forEach((key, i) => {
  const nvidia = createOpenAI({ apiKey: key, baseURL: 'https://integrate.api.nvidia.com/v1' });
  keyPool.register({
    id: `nvidia-llama3-${i + 1}`,
    name: `NVIDIA Llama 3.1 70B (${i + 1})`,
    model: nvidia('meta/llama-3.1-70b-instruct'),
    supportsStructured: true,
    priority: 4,
  });
});

// ── PRIORITY 4: XAI GROK ────────────────────────────────────────────────
getEnvKeys('XAI_API_KEY').forEach((key, i) => {
  const xai = createOpenAI({ apiKey: key, baseURL: 'https://api.x.ai/v1' });
  keyPool.register({
    id: `xai-grok-${i + 1}`,
    name: `xAI Grok Beta (${i + 1})`,
    model: xai('grok-beta'),
    supportsStructured: true,
    priority: 4,
  });
});

// ── PRIORITY 4: PERPLEXITY ────────────────────────────────────────────────
getEnvKeys('PERPLEXITY_API_KEY').forEach((key, i) => {
  const perplexity = createOpenAI({ apiKey: key, baseURL: 'https://api.perplexity.ai' });
  keyPool.register({
    id: `perplexity-sonar-${i + 1}`,
    name: `Perplexity Sonar 70B (${i + 1})`,
    model: perplexity('llama-3.1-sonar-large-128k-chat'),
    supportsStructured: true,
    priority: 4,
  });
});

// ── PRIORITY 4: NOVITA AI ────────────────────────────────────────────────
getEnvKeys('NOVITA_API_KEY').forEach((key, i) => {
  const novita = createOpenAI({ apiKey: key, baseURL: 'https://api.novita.ai/v3/openai' });
  keyPool.register({
    id: `novita-llama3-${i + 1}`,
    name: `Novita Llama 3.1 70B (${i + 1})`,
    model: novita.chat('meta-llama/llama-3.1-70b-instruct'),
    supportsStructured: true,
    priority: 4,
  });
});

// ── PRIORITY 4: AI21 JAMBA ────────────────────────────────────────────────
getEnvKeys('AI21_API_KEY').forEach((key, i) => {
  const ai21 = createOpenAI({ apiKey: key, baseURL: 'https://api.ai21.com/studio/v1' });
  keyPool.register({
    id: `ai21-jamba-${i + 1}`,
    name: `AI21 Jamba 1.5 Large (${i + 1})`,
    model: ai21('jamba-1.5-large'),
    supportsStructured: true,
    priority: 4,
  });
});

// ── PRIORITY 4: LEPTON AI ────────────────────────────────────────────────
getEnvKeys('LEPTON_API_KEY').forEach((key, i) => {
  const lepton = createOpenAI({ apiKey: key, baseURL: 'https://llama3-1-70b.lepton.run/api/v1' });
  keyPool.register({
    id: `lepton-llama3-${i + 1}`,
    name: `Lepton Llama 3.1 70B (${i + 1})`,
    model: lepton('llama3-1-70b'),
    supportsStructured: true,
    priority: 4,
  });
});

// ── PRIORITY 4: ALIBABA QWEN (DASHSCOPE) ────────────────────────────────────────────────
getEnvKeys('DASHSCOPE_API_KEY').forEach((key, i) => {
  const qwen = createOpenAI({ apiKey: key, baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1' });
  keyPool.register({
    id: `qwen-plus-${i + 1}`,
    name: `Alibaba Qwen Plus (${i + 1})`,
    model: qwen('qwen-plus'),
    supportsStructured: true,
    priority: 4,
  });
});

// ── PRIORITY 5: CLOUDFLARE WORKERS AI ────────────────────────────────────────────────
const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
getEnvKeys('CLOUDFLARE_AI_TOKEN').forEach((key, i) => {
  if (!cfAccountId) return;
  const cf = createOpenAI({ apiKey: key, baseURL: `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/v1` });
  keyPool.register({
    id: `cloudflare-llama3-${i + 1}`,
    name: `Cloudflare Llama 3 8B (${i + 1})`,
    model: cf.chat('@cf/meta/llama-3-8b-instruct'),
    supportsStructured: true,
    priority: 5,
  });
});

// 🚀 PRIORITY 1: GOOGLE GEMINI (Working perfectly without Rate limits)
getEnvKeys('GOOGLE_GENERATIVE_AI_API_KEY').forEach((key, i) => {
  const google = createGoogle({ apiKey: key });
  keyPool.register({
    id: `google-gemini-${i + 1}`,
    name: `Google Gemini 2.5 Flash (${i + 1})`,
    model: google('gemini-2.5-flash'),
    supportsStructured: true,
    priority: 1, // SET TO PRIORITY 1
  });
});

// 🚀 PRIORITY 5: HUGGING FACE (DE-PRIORITIZED DUE TO CLOUDFLARE BANS)
getEnvKeys('HUGGINGFACE_API_KEY').forEach((key, i) => {
  // We use the openai compatible endpoint for HF serverless Inference API
  const hf = createOpenAI({
    apiKey: key,
    baseURL: 'https://api-inference.huggingface.co/v1/'
  });
  keyPool.register({
    id: `hf-qwen-72b-${i + 1}`,
    name: `HuggingFace Qwen 2.5 72B (${i + 1})`,
    model: hf('Qwen/Qwen2.5-72B-Instruct'),
    supportsStructured: true,
    priority: 5,
  });
});

if (keyPool.size === 0) {
  console.warn('[AI Router] No API keys found! AI generation will fail.');
} else {
  console.log(`[AI Router] Loaded ${keyPool.size} model(s) into the pool.`);
  keyPool.restoreFromDb().catch(e => console.error('[AI Router] Failed to restore key pool state:', e));
}

// ------------------------------------------------------------------
// 2. GENERATION WITH FALLBACK
// ------------------------------------------------------------------

const MAX_RETRIES = 20;
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

    console.log(`[AI Router] [Attempt ${attempt}/${MAX_RETRIES}] → ${activeKey.name}`);

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
      console.warn(`[AI Router] ${activeKey.name} failed (attempt ${attempt}): ${err.message?.slice(0, 120)}`);
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

  getEnvKeys('MISTRAL_API_KEY').forEach((key, i) => {
    const mistral = createMistral({ apiKey: key });
    pool.push({
      id: `mistral-pixtral-${i + 1}`,
      name: `Mistral Pixtral 12B (${i + 1})`,
      model: mistral('pixtral-12b-2409'),
    });
  });

  const googleKeys = [...getEnvKeys('GOOGLE_GENERATIVE_AI_API_KEY'), ...getEnvKeys('GEMINI_API_KEY')];
  Array.from(new Set(googleKeys)).forEach((key, i) => {
    const makeGoogle = createGoogle({ apiKey: key });
    pool.push({
      id: `google-vision-${i + 1}`,
      name: `Google Gemini 2.5 Flash Vision (${i + 1})`,
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
      console.log(`[Vision Router] Attempting vision OCR with ${candidate.name}...`);
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
