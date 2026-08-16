import { createOpenAI } from '@ai-sdk/openai';
import { createGroq } from '@ai-sdk/groq';
import { generateObject } from 'ai';
import { z } from 'zod';

const schema = z.object({ capital: z.string() });
const prompt = 'What is the capital of Kenya? Reply in JSON.';

async function test(name: string, model: any) {
  try {
    const res = await generateObject({ model, schema, prompt });
    console.log(`✅ ${name}: ${JSON.stringify(res.object)}`);
  } catch (e: any) {
    console.log(`❌ ${name}: ${e?.message?.slice(0, 120)}`);
  }
}

async function run() {
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
  await test('Groq llama3-70b-8192', groq('llama3-70b-8192'));
  await test('Groq llama-3.1-8b-instant', groq('llama-3.1-8b-instant'));

  const cer = createOpenAI({ apiKey: process.env.CEREBRAS_API_KEY, baseURL: 'https://api.cerebras.ai/v1' });
  await test('Cerebras llama3.1-8b', cer('llama3.1-8b'));

  const samba = createOpenAI({ apiKey: process.env.SAMBANOVA_API_KEY, baseURL: 'https://api.sambanova.ai/v1' });
  await test('SambaNova Meta-Llama-3.1-405B-Instruct', samba('Meta-Llama-3.1-405B-Instruct'));
  await test('SambaNova Meta-Llama-3.1-70B-Instruct', samba('Meta-Llama-3.1-70B-Instruct'));
  await test('SambaNova Llama-3.1-Tulu-3-405B', samba('Llama-3.1-Tulu-3-405B'));

  const or = createOpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: 'https://openrouter.ai/api/v1' });
  await test('OpenRouter qwen-2', or('qwen/qwen-2-7b-instruct:free'));
  await test('OpenRouter mistral-nemo', or('mistralai/mistral-nemo:free'));
  await test('OpenRouter gemini-exp', or('google/gemini-exp-1206:free'));
  await test('OpenRouter llama-3.2-3b', or('meta-llama/llama-3.2-3b-instruct:free'));
}
run();
