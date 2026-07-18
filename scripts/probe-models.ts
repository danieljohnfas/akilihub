import { generateObject } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import { createCohere } from '@ai-sdk/cohere';
import { z } from 'zod';

async function testModel(name: string, model: any) {
  try {
    const res = await generateObject({
      model,
      schema: z.object({ title: z.string() }),
      prompt: "Extract: Software Engineer",
      maxRetries: 0
    });
    console.log(`✅ [${name}] Success: ${res.object.title}`);
  } catch (e: any) {
    console.log(`❌ [${name}] Failed: ${e.message}`);
  }
}

async function main() {
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
  await testModel('Groq llama3-8b-8192', groq('llama3-8b-8192'));
  await testModel('Groq mixtral-8x7b-32768', groq('mixtral-8x7b-32768'));
  
  const or = createOpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY });
  await testModel('OR google/gemma-2-9b-it:free', or('google/gemma-2-9b-it:free'));
  await testModel('OR meta-llama/llama-3.1-8b-instruct:free', or('meta-llama/llama-3.1-8b-instruct:free'));
  await testModel('OR qwen/qwen-2-7b-instruct:free', or('qwen/qwen-2-7b-instruct:free'));
  
  const cohere = createCohere({ apiKey: process.env.COHERE_API_KEY });
  await testModel('Cohere command-r-08-2024', cohere('command-r-08-2024'));

  const sn = createOpenAI({ baseURL: 'https://api.sambanova.ai/v1', apiKey: process.env.SAMBANOVA_API_KEY });
  await testModel('SambaNova Meta-Llama-3.1-70B-Instruct', sn('Meta-Llama-3.1-70B-Instruct'));
}

main().catch(console.error);
