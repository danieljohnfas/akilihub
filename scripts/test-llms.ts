import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { generateText } from 'ai';

async function testAll() {
  const { keyPool } = await import('../src/lib/ai/router');
  const allKeys = keyPool.getAllKeys();
  console.log(`Starting test for ${allKeys.length} models...`);

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const entry of allKeys) {
    process.stdout.write(`Testing [${entry.id}] ${entry.name}... `);
    try {
      const response = await generateText({
        model: entry.model,
        prompt: "Respond with exactly one word: OK",
        maxTokens: 5,
        abortSignal: AbortSignal.timeout(15000)
      });
      console.log(`✅ Passed (${response.text.trim().replace(/\n/g, ' ')})`);
      passed++;
    } catch (e: any) {
      console.log(`❌ Failed: ${e.message}`);
      failed++;
      failures.push({ id: entry.id, error: e.message });
    }
  }
  
  console.log("\n--- TEST SUMMARY ---");
  console.log(`Total Models Tested: ${allKeys.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failures.length > 0) {
    console.log("\n--- FAILURES ---");
    failures.forEach(f => {
      console.log(`- ${f.id}: ${f.error}`);
    });
  }
}

testAll().catch(console.error);
