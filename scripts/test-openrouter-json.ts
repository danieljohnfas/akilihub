import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

const schema = z.object({ capital: z.string() });
const prompt = 'What is the capital of Kenya? Reply in JSON.';

async function run() {
  const or = createOpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: 'https://openrouter.ai/api/v1' });
  try {
    const res = await generateObject({ model: or('openrouter/free'), schema, prompt });
    console.log(`✅ OpenRouter (auto): ${JSON.stringify(res.object)}`);
  } catch (e: any) { console.log(`❌ auto: ${e?.message?.slice(0, 120)}`); }
}
run();
