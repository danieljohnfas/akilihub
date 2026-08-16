import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

const schema = z.object({ capital: z.string() });
const prompt = 'What is the capital of Kenya? Reply in JSON.';

async function run() {
  const nvidia = createOpenAI({ apiKey: process.env.NVIDIA_API_KEY, baseURL: 'https://integrate.api.nvidia.com/v1' });
  try {
    const res = await generateObject({ model: nvidia('nvidia/llama-3.1-nemotron-70b-instruct'), schema, prompt, mode: 'json' });
    console.log(`✅ NVIDIA JSON: ${JSON.stringify(res.object)}`);
  } catch (e: any) { console.log(`❌ NVIDIA JSON: ${e?.message?.slice(0, 120)}`); }
}
run();
