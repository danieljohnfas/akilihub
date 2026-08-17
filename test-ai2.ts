import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

const hyperbolic = createOpenAI({apiKey: process.env.HYPERBOLIC_API_KEY, baseURL: 'https://api.hyperbolic.xyz/v1'});

async function run() {
  try {
    console.log('Testing Hyperbolic JSON mode...');
    await generateObject({
      model: hyperbolic('meta-llama/Llama-3.3-70B-Instruct'),
      mode: 'json',
      schema: z.object({test: z.string()}),
      prompt: 'Return {"test":"hello"}'
    }).then(r => console.log(r.object)).catch(e => console.error('Hyperbolic Error:', e.message));
  } catch(e) {
    console.error(e);
  }
}
run();
