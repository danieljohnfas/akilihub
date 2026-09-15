import { generateText } from 'ai';
import '../src/lib/ai/router';
import { keyPool } from '../src/lib/ai/key-pool';

async function testModels() {
  console.log('⏳ Initializing model pool...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const allKeys = Array.from(((keyPool as any).keys as Map<string, any>).values());
  if (allKeys.length === 0) {
    console.log("❌ No models loaded in the key pool.");
    process.exit(1);
  }
  
  console.log(`🚀 Found ${allKeys.length} loaded models. Running tests concurrently...\n`);
  
  const promises = allKeys.map(async (k) => {
    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 10000); // 10 second timeout
      
      const { text } = await generateText({
        model: k.model,
        prompt: 'Reply with the exact word "OK" and nothing else.',
        abortSignal: abortController.signal,
      });
      clearTimeout(timeoutId);
      
      return { name: k.name, status: 'Active', message: text.trim() };
    } catch (err: any) {
      const errMsg = err.message || err.toString();
      let cleanErr = errMsg.replace(/\n/g, ' ').slice(0, 120);
      if (cleanErr.includes('AbortError') || cleanErr.includes('abort')) {
        cleanErr = 'Timeout after 10 seconds';
      }
      return { name: k.name, status: 'Failed', message: cleanErr };
    }
  });

  const results = await Promise.all(promises);
  
  for (const r of results) {
    if (r.status === 'Active') {
      console.log(`✅ [OK] ${r.name}`);
    } else {
      console.log(`❌ [FAIL] ${r.name} - ${r.message}`);
    }
  }
  
  console.log('\n--- SUMMARY ---');
  console.log(`Active: ${results.filter(r => r.status === 'Active').length}`);
  console.log(`Failed: ${results.filter(r => r.status === 'Failed').length}`);
  
  process.exit(0);
}

testModels().catch(console.error);
