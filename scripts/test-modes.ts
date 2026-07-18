import { config } from '@dotenvx/dotenvx';
config({ path: '.env.local', quiet: true });

import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

const schema = z.object({ title: z.string(), company: z.string() });

async function test(name: string, model: any, mode?: 'json' | 'tool') {
  try {
    const r = await generateObject({
      model, schema,
      prompt: 'Extract: Software Engineer at Google',
      maxRetries: 0,
      ...(mode ? { mode } : {})
    });
    console.log(`✅ ${name}:`, JSON.stringify(r.object));
  } catch (e: any) {
    console.log(`❌ ${name}:`, e.message?.slice(0, 200));
  }
}

async function main() {
  // SambaNova with compatibility: 'compatible' to force Chat Completions API
  const sn = createOpenAI({
    baseURL: 'https://api.sambanova.ai/v1',
    apiKey: process.env.SAMBANOVA_API_KEY,
  });
  await test('SambaNova DeepSeek-V3.1 [compatible+json]', sn('DeepSeek-V3.1'), 'json');
  await test('SambaNova Meta-Llama-3.3-70B [compatible+json]', sn('Meta-Llama-3.3-70B-Instruct'), 'json');
  await test('SambaNova gpt-oss-120b [compatible+auto]', sn('gpt-oss-120b'));

  // Cerebras - try with compatibility flag
  const cer = createOpenAI({
    baseURL: 'https://api.cerebras.ai/v1',
    apiKey: process.env.CEREBRAS_API_KEY,
  });
  await test('Cerebras gemma-4-31b [compatible+auto]', cer('gemma-4-31b'));
  await test('Cerebras gemma-4-31b [compatible+json]', cer('gemma-4-31b'), 'json');

  // DeepSeek - try base URL without /v1
  const ds1 = createOpenAI({ baseURL: 'https://api.deepseek.com', apiKey: process.env.DEEPSEEK_API_KEY });
  await test('DeepSeek v4-flash [base+json]', ds1('deepseek-v4-flash'), 'json');

  // Hyperbolic - test with auth header check
  const hyp = createOpenAI({
    baseURL: 'https://api.hyperbolic.xyz/v1',
    apiKey: process.env.HYPERBOLIC_API_KEY,
  });
  await test('Hyperbolic DeepSeek-V3-0324 [compatible+json]', hyp('deepseek-ai/DeepSeek-V3-0324'), 'json');
  await test('Hyperbolic Llama-3.3-70B [compatible+json]', hyp('meta-llama/Llama-3.3-70B-Instruct'), 'json');
}

main().catch(console.error);
