import { config } from 'dotenv';
config({ path: '.env.local' });
import { keyPool } from '../src/lib/ai/key-pool';
import { generateText } from 'ai';

// Re-run the router loading logic to ensure keys are loaded
function getEnvKeys(baseName: string): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(baseName) && value && value.trim() !== '') {
      keys.push(value.trim());
    }
  }
  return keys;
}

getEnvKeys('GOOGLE_GENERATIVE_AI_API_KEY').forEach((key, i) => {
  const { google: makeGoogle } = require('@ai-sdk/google');
  keyPool.register({ id: `google-flash-${i + 1}`, name: `Google Gemini Flash (${i + 1})`, model: makeGoogle('gemini-2.5-flash', { apiKey: key }), supportsStructured: true });
});

getEnvKeys('GROQ_API_KEY').forEach((key, i) => {
  const { createGroq } = require('@ai-sdk/groq');
  const groq = createGroq({ apiKey: key });
  keyPool.register({ id: `groq-llama33-${i + 1}`, name: `Groq LLaMA 3.3 70B (${i + 1})`, model: groq('llama-3.3-70b-versatile'), supportsStructured: true });
});

getEnvKeys('MISTRAL_API_KEY').forEach((key, i) => {
  const { createMistral } = require('@ai-sdk/mistral');
  const mistral = createMistral({ apiKey: key });
  keyPool.register({ id: `mistral-small-${i + 1}`, name: `Mistral Small (${i + 1})`, model: mistral('mistral-small-latest'), supportsStructured: true });
});

getEnvKeys('COHERE_API_KEY').forEach((key, i) => {
  const { createCohere } = require('@ai-sdk/cohere');
  const cohere = createCohere({ apiKey: key });
  keyPool.register({ id: `cohere-command-r-${i + 1}`, name: `Cohere Command R+ (${i + 1})`, model: cohere('command-r-plus-08-2024'), supportsStructured: true });
});

getEnvKeys('MINIMAX_API_KEY').forEach((key, i) => {
  const { createOpenAI } = require('@ai-sdk/openai');
  const minimax = createOpenAI({ apiKey: key, baseURL: 'https://api.minimax.chat/v1' });
  keyPool.register({ id: `minimax-m3-${i + 1}`, name: `Minimax M3 (${i + 1})`, model: minimax('MiniMax-Text-01'), supportsStructured: true });
});

getEnvKeys('OPENROUTER_API_KEY').forEach((key, i) => {
  const { createOpenAI } = require('@ai-sdk/openai');
  const openrouter = createOpenAI({ apiKey: key, baseURL: 'https://openrouter.ai/api/v1' });
  keyPool.register({ id: `openrouter-${i + 1}`, name: `OpenRouter (${i + 1})`, model: openrouter('meta-llama/llama-3.3-70b-instruct'), supportsStructured: true });
});

getEnvKeys('DEEPSEEK_API_KEY').forEach((key, i) => {
  const { createOpenAI } = require('@ai-sdk/openai');
  const deepseek = createOpenAI({ apiKey: key, baseURL: 'https://api.deepseek.com' });
  // Updated model string
  keyPool.register({ id: `deepseek-${i + 1}`, name: `DeepSeek Chat (${i + 1})`, model: deepseek('deepseek-v4-flash'), supportsStructured: true });
});

getEnvKeys('SAMBANOVA_API_KEY').forEach((key, i) => {
  const { createOpenAI } = require('@ai-sdk/openai');
  const sambanova = createOpenAI({ apiKey: key, baseURL: 'https://api.sambanova.ai/v1' });
  // Updated model string
  keyPool.register({ id: `sambanova-${i + 1}`, name: `SambaNova Llama3.1 70B (${i + 1})`, model: sambanova('Meta-Llama-3.3-70B-Instruct'), supportsStructured: true });
});

getEnvKeys('CEREBRAS_API_KEY').forEach((key, i) => {
  const { createOpenAI } = require('@ai-sdk/openai');
  const cerebras = createOpenAI({ apiKey: key, baseURL: 'https://api.cerebras.ai/v1' });
  // Updated model string
  keyPool.register({ id: `cerebras-${i + 1}`, name: `Cerebras Llama3.1 70B (${i + 1})`, model: cerebras('gemma-4-31b'), supportsStructured: true });
});

getEnvKeys('HYPERBOLIC_API_KEY').forEach((key, i) => {
  const { createOpenAI } = require('@ai-sdk/openai');
  const hyperbolic = createOpenAI({ apiKey: key, baseURL: 'https://api.hyperbolic.xyz/v1' });
  // Updated model string
  keyPool.register({ id: `hyperbolic-${i + 1}`, name: `Hyperbolic Llama3.1 70B (${i + 1})`, model: hyperbolic('meta-llama/Llama-3.3-70B-Instruct'), supportsStructured: true });
});

async function runTests() {
  const keysMap = (keyPool as any).keys as Map<string, any>;
  const models = Array.from(keysMap.values());
  console.log(`Testing ${models.length} AI models...`);
  let operationalCount = 0;
  
  for (const m of models) {
    try {
      const modelDef = (m as any).model;
      const res = await generateText({
        model: modelDef,
        prompt: "Reply with exactly one word: 'OK'",
      });
      console.log(`✅ ${((m as any).name).padEnd(30)} -> Success (${res.text.trim().substring(0, 5)})`);
      operationalCount++;
    } catch (e: any) {
      console.log(`❌ ${((m as any).name).padEnd(30)} -> Failed: ${e.message.split('\\n')[0]}`);
    }
  }
  
  console.log(`\\n--- RESULT ---`);
  console.log(`${operationalCount} out of ${models.length} AIs are currently operational.`);
}

runTests();
