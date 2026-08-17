import { generateObject } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

const groq = createGroq({apiKey: process.env.GROQ_API_KEY});
const samba = createOpenAI({apiKey: process.env.SAMBANOVA_API_KEY, baseURL: 'https://api.sambanova.ai/v1'});

async function run() {
  try {
    console.log('Testing Groq JSON mode...');
    await generateObject({
      model: groq('llama-3.3-70b-versatile'),
      mode: 'json',
      schema: z.object({test: z.string()}),
      prompt: 'Return {"test":"hello"}'
    }).then(r => console.log(r.object)).catch(e => console.error('Groq Error:', e.message));

    console.log('Testing SambaNova JSON mode...');
    await generateObject({
      model: samba('Meta-Llama-3.3-70B-Instruct'),
      mode: 'json',
      schema: z.object({test: z.string()}),
      prompt: 'Return {"test":"hello"}'
    }).then(r => console.log(r.object)).catch(e => console.error('SambaNova Error:', e.message));

  } catch(e) {
    console.error(e);
  }
}
run();
