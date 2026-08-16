import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

const schema = z.object({ capital: z.string() });
const prompt = 'What is the capital of Kenya? Reply in JSON.';

async function run() {
  const groq = createOpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
  try {
    const res = await generateObject({ model: groq('llama-3.3-70b-versatile'), schema, prompt, mode: 'json' });
    console.log(`✅ Groq (OpenAI compat, json): ${JSON.stringify(res.object)}`);
  } catch (e: any) { console.log(`❌ json: ${e?.message?.slice(0, 120)}`); }
  try {
    const res = await generateObject({ model: groq('llama-3.3-70b-versatile'), schema, prompt, mode: 'auto' });
    console.log(`✅ Groq (OpenAI compat, auto): ${JSON.stringify(res.object)}`);
  } catch (e: any) { console.log(`❌ auto: ${e?.message?.slice(0, 120)}`); }
}
run();
