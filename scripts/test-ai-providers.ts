/**
 * AI Provider Health Check
 * Tests every configured provider with a minimal structured-output request.
 */
import { createGoogle } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createCohere } from '@ai-sdk/cohere';
import { createOpenAI } from '@ai-sdk/openai';
import { createGroq } from '@ai-sdk/groq';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';

const schema = z.object({ capital: z.string() });
const prompt = 'What is the capital of Kenya? Reply in JSON.';

type ProviderResult = { name: string; status: 'ok' | 'fail'; ms?: number; error?: string };

async function testObject(name: string, modelFn: () => any): Promise<ProviderResult> {
  const start = Date.now();
  try {
    const model = modelFn();
    await generateObject({ model, schema, prompt, mode: 'json' });
    return { name, status: 'ok', ms: Date.now() - start };
  } catch (e: any) {
    return { name, status: 'fail', ms: Date.now() - start, error: e?.message?.slice(0, 120) };
  }
}

async function testText(name: string, modelFn: () => any): Promise<ProviderResult> {
  const start = Date.now();
  try {
    const model = modelFn();
    await generateText({ model, prompt });
    return { name, status: 'ok', ms: Date.now() - start };
  } catch (e: any) {
    return { name, status: 'fail', ms: Date.now() - start, error: e?.message?.slice(0, 120) };
  }
}

function keys(base: string): string[] {
  const out: string[] = [];
  const pat = new RegExp(`^${base}(?:_\\d+)?$`);
  for (const [k, v] of Object.entries(process.env)) {
    if (pat.test(k) && v?.trim()) out.push(v.trim());
  }
  return out;
}

async function main() {
  const tests: (() => Promise<ProviderResult>)[] = [];

  // Groq, Cerebras, SambaNova, OpenRouter are configured as supportsStructured: false in router.ts,
  // so they will only be used with generateText in the app. We test them with testText.

  for (const [i, k] of keys('GROQ_API_KEY').entries())
    tests.push(() => testText(`Groq Llama 3.3 70B (${i+1})`, () => createGroq({ apiKey: k })('llama-3.3-70b-versatile')));

  for (const [i, k] of keys('MISTRAL_API_KEY').entries())
    tests.push(() => testObject(`Mistral Small (${i+1})`, () => createMistral({ apiKey: k })('mistral-small-latest')));

  for (const [i, k] of keys('GOOGLE_GENERATIVE_AI_API_KEY').entries())
    tests.push(() => testObject(`Gemini 2.5 Flash (${i+1})`, () => createGoogle({ apiKey: k })('gemini-2.5-flash')));

  for (const [i, k] of keys('CEREBRAS_API_KEY').entries())
    tests.push(() => testText(`Cerebras Llama 3.1 8B (${i+1})`, () => createOpenAI({ apiKey: k, baseURL: 'https://api.cerebras.ai/v1' })('llama3.1-8b')));

  for (const [i, k] of keys('SAMBANOVA_API_KEY').entries())
    tests.push(() => testText(`SambaNova Llama 3.1 70B (${i+1})`, () => createOpenAI({ apiKey: k, baseURL: 'https://api.sambanova.ai/v1' })('Meta-Llama-3.1-70B-Instruct')));

  for (const [i, k] of keys('DEEPSEEK_API_KEY').entries())
    tests.push(() => testObject(`DeepSeek Chat (${i+1})`, () => createOpenAI({ apiKey: k, baseURL: 'https://api.deepseek.com/v1' })('deepseek-chat')));

  for (const [i, k] of keys('OPENROUTER_API_KEY').entries())
    tests.push(() => testText(`OpenRouter Free (${i+1})`, () => createOpenAI({ apiKey: k, baseURL: 'https://openrouter.ai/api/v1' })('openrouter/free')));

  for (const [i, k] of keys('COHERE_API_KEY').entries())
    tests.push(() => testObject(`Cohere Command R+ (${i+1})`, () => createCohere({ apiKey: k })('command-r-plus-08-2024')));

  for (const [i, k] of keys('HUGGINGFACE_API_KEY').entries())
    tests.push(() => testText(`HuggingFace Llama 3.3 70B (${i+1})`, () => createOpenAI({ apiKey: k, baseURL: 'https://router.huggingface.co/v1' })('meta-llama/Llama-3.3-70B-Instruct')));

  console.log(`\n🔍 Testing ${tests.length} AI provider(s)...\n`);

  const results = await Promise.all(tests.map(t => t()));

  const ok = results.filter(r => r.status === 'ok');
  const fail = results.filter(r => r.status === 'fail');

  console.log('='.repeat(70));
  for (const r of results) {
    const icon = r.status === 'ok' ? '✅' : '❌';
    const extra = r.status === 'ok' ? `${r.ms}ms` : r.error;
    console.log(`${icon}  ${r.name.padEnd(35)} ${extra}`);
  }
  console.log('='.repeat(70));
  console.log(`\n✅ Working: ${ok.length}  |  ❌ Broken: ${fail.length}\n`);
}

main().catch(console.error);
