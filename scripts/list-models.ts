import { config } from '@dotenvx/dotenvx';
config({ path: '.env.local', quiet: true });

async function main() {
  // List Groq models
  const groqRes = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }
  });
  const groq = await groqRes.json();
  console.log('\n=== GROQ MODELS ===');
  groq.data?.forEach((m: any) => console.log(m.id));

  // List Cerebras models
  const cerRes = await fetch('https://api.cerebras.ai/v1/models', {
    headers: { Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}` }
  });
  const cer = await cerRes.json();
  console.log('\n=== CEREBRAS MODELS ===');
  cer.data?.forEach((m: any) => console.log(m.id));

  // List SambaNova models
  const snRes = await fetch('https://api.sambanova.ai/v1/models', {
    headers: { Authorization: `Bearer ${process.env.SAMBANOVA_API_KEY}` }
  });
  const sn = await snRes.json();
  console.log('\n=== SAMBANOVA MODELS ===');
  sn.data?.forEach((m: any) => console.log(m.id));

  // Check DeepSeek
  const dsRes = await fetch('https://api.deepseek.com/v1/models', {
    headers: { Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` }
  });
  console.log('\n=== DEEPSEEK STATUS ===', dsRes.status, await dsRes.text());

  // Check Hyperbolic
  const hypRes = await fetch('https://api.hyperbolic.xyz/v1/models', {
    headers: { Authorization: `Bearer ${process.env.HYPERBOLIC_API_KEY}` }
  });
  const hyp = await hypRes.json();
  console.log('\n=== HYPERBOLIC MODELS ===');
  hyp.data?.slice(0, 10).forEach((m: any) => console.log(m.id));
}

main().catch(console.error);
