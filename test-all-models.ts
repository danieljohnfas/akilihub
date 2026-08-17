import { config } from 'dotenv';
config({ path: '.env.local' });

async function run() {
  const { keyPool } = await import('./src/lib/ai/key-pool');
  await import('./src/lib/ai/router');
  const { generateText } = await import('ai');

  // @ts-ignore
  const keys = Array.from(keyPool.keys.values());
  console.log(`\n================================`);
  console.log(`Found ${keys.length} models to test`);
  console.log(`================================\n`);
  
  const results = { success: 0, failed: 0 };
  
  for (const k of keys) {
    process.stdout.write(`Testing ${k.name.padEnd(40, ' ')}... `);
    try {
      // Use a strict timeout wrapper just in case the provider hangs forever
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 15s')), 15000)
      );
      
      const res: any = await Promise.race([
        generateText({
          model: k.model as any,
          prompt: "Say the word 'Hello'"
        }),
        timeoutPromise
      ]);
      
      console.log(`✅ SUCCESS (${res.text.trim().replace(/\n/g, ' ')})`);
      results.success++;
    } catch (e: any) {
      const errMsg = e.message || String(e);
      console.log(`\n❌ ERROR for ${k.name}: ${errMsg}`);
      results.failed++;
    }
  }
  
  console.log(`\n================================`);
  console.log(`Results: ${results.success} working, ${results.failed} failed`);
  console.log(`================================\n`);
  process.exit(0);
}

run();
