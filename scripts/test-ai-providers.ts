import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
(process.env as any).NODE_ENV = 'production';

import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogle } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createCohere } from '@ai-sdk/cohere';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';

const TIMEOUT_MS = 25000;
const schema = z.object({ answer: z.string() });
const prompt = 'What is the capital of Kenya? Respond concisely.';

function env(name: string): string | undefined {
  return process.env[name]?.trim();
}

interface ProviderDef {
  name: string;
  priority: number;
  build: () => any;
}

const providers: ProviderDef[] = [];

if (env('CEREBRAS_API_KEY')) providers.push({ name: 'Cerebras Llama 3.3 70B', priority: 1, build: () => createOpenAI({ apiKey: env('CEREBRAS_API_KEY')!, baseURL: 'https://api.cerebras.ai/v1' })('llama-3.3-70b') });
if (env('SAMBANOVA_API_KEY')) providers.push({ name: 'SambaNova Llama 3.3 70B', priority: 1, build: () => createOpenAI({ apiKey: env('SAMBANOVA_API_KEY')!, baseURL: 'https://api.sambanova.ai/v1', compatibility: 'compatible' })('Meta-Llama-3.3-70B-Instruct') });
if (env('ZAI_API_KEY')) providers.push({ name: 'Z.ai GLM-5.2', priority: 1, build: () => createOpenAI({ apiKey: env('ZAI_API_KEY')!, baseURL: 'https://open.bigmodel.cn/api/paas/v4/' })('glm-5.2') });
if (env('GROQ_API_KEY')) providers.push({ name: 'Groq Llama 3 70B', priority: 1, build: () => createGroq({ apiKey: env('GROQ_API_KEY')! })('llama3-70b-8192') });
if (env('MISTRAL_API_KEY')) providers.push({ name: 'Mistral Small', priority: 2, build: () => createMistral({ apiKey: env('MISTRAL_API_KEY')! })('mistral-small-latest') });
if (env('GOOGLE_GENERATIVE_AI_API_KEY')) providers.push({ name: 'Google Gemini 2.5 Flash', priority: 3, build: () => createGoogle({ apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY')! })('gemini-2.5-flash') });
if (env('CLOUDFLARE_API_TOKEN') && env('CLOUDFLARE_ACCOUNT_ID')) providers.push({ name: 'Cloudflare Workers AI', priority: 5, build: () => createOpenAI({ apiKey: env('CLOUDFLARE_API_TOKEN')!, baseURL: `https://api.cloudflare.com/client/v4/accounts/${env('CLOUDFLARE_ACCOUNT_ID')}/ai/v1`, compatibility: 'compatible' })('@cf/meta/llama-3.2-3b-instruct') });
if (env('HYPERBOLIC_API_KEY')) providers.push({ name: 'Hyperbolic Llama 3.3 70B', priority: 5, build: () => createOpenAI({ apiKey: env('HYPERBOLIC_API_KEY')!, baseURL: 'https://api.hyperbolic.xyz/v1' })('meta-llama/Llama-3.3-70B-Instruct') });
if (env('OPENROUTER_API_KEY')) providers.push({ name: 'OpenRouter Gemma 2 9B Free', priority: 6, build: () => createOpenAI({ apiKey: env('OPENROUTER_API_KEY')!, baseURL: 'https://openrouter.ai/api/v1', defaultHeaders: { 'HTTP-Referer': 'https://akilibrain.com' } })('google/gemma-2-9b-it:free') });
if (env('HUGGINGFACE_API_KEY')) providers.push({ name: 'HuggingFace Llama 3.3 70B', priority: 8, build: () => createOpenAI({ apiKey: env('HUGGINGFACE_API_KEY')!, baseURL: 'https://router.huggingface.co/v1' })('meta-llama/Llama-3.3-70B-Instruct') });
if (env('COHERE_API_KEY')) providers.push({ name: 'Cohere Command R+', priority: 9, build: () => createCohere({ apiKey: env('COHERE_API_KEY')! })('command-r-plus-08-2024') });

async function main() {
  for (const p of providers) {
    try {
      const model = p.build();
      const { object } = await generateObject({ model, schema, prompt }) as any;
      console.log(`✅ [P${p.priority}] ${p.name}`);
    } catch (e: any) {
      console.log(`❌ [P${p.priority}] ${p.name} — ${String(e?.message || e).slice(0, 150)}`);
    }
  }
}
main();
