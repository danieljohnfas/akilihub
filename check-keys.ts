import { getEnvKeys } from './src/lib/ai/router';
console.log('Available API Keys in env:');
console.log('GROQ:', getEnvKeys('GROQ_API_KEY').length);
console.log('HUGGINGFACE:', getEnvKeys('HUGGINGFACE_API_KEY').length);
console.log('OPENROUTER:', getEnvKeys('OPENROUTER_API_KEY').length);
console.log('GEMINI:', getEnvKeys('GOOGLE_GENERATIVE_AI_API_KEY').length);
console.log('CEREBRAS:', getEnvKeys('CEREBRAS_API_KEY').length);
console.log('DEEPSEEK:', getEnvKeys('DEEPSEEK_API_KEY').length);
