import 'dotenv/config';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { getTextModelPool } from '../src/lib/ai/router';
import { keyPool } from '../src/lib/ai/router';

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

async function testModels() {
  console.log('--- AI Model Health Check ---');
  const pool = keyPool.getAllKeys();
  console.log(`Found ${pool.length} models in the pool.\n`);
  
  const results = [];
  
  for (const entry of pool) {
    process.stdout.write(`Testing ${entry.name}... `);
    let textStatus = 'FAILED';
    let jsonStatus = 'FAILED';
    let errorMsg = '';
    
    // 1. Test standard text generation
    try {
      const { text } = await withTimeout(generateText({
        model: entry.model,
        prompt: 'Say the word "pong".'
      }), 15000);
      
      if (text.toLowerCase().includes('pong')) {
        textStatus = 'OK';
      } else {
        textStatus = 'BAD_OUTPUT';
      }
    } catch (err: any) {
      errorMsg = err.message?.slice(0, 80) || 'Unknown error';
    }
    
    // 2. Test JSON structure generation (if text passed and supportsStructured is true)
    if (textStatus === 'OK' && entry.supportsStructured) {
      try {
        const { object } = await withTimeout(generateObject({
          model: entry.model,
          prompt: 'Return a JSON object with a single boolean field "alive" set to true.',
          schema: z.object({ alive: z.boolean() })
        }), 15000);
        
        if (object.alive === true) {
          jsonStatus = 'OK';
        } else {
          jsonStatus = 'BAD_OUTPUT';
        }
      } catch (err: any) {
        jsonStatus = 'ERR: ' + (err.message?.slice(0, 40) || 'Unknown error');
      }
    } else if (!entry.supportsStructured) {
      jsonStatus = 'UNSUPPORTED';
    }
    
    console.log(`[Text: ${textStatus}] [JSON: ${jsonStatus}]`);
    if (errorMsg) console.log(`   -> Error: ${errorMsg}`);
    
    results.push({
      name: entry.name,
      priority: entry.priority,
      text: textStatus,
      json: jsonStatus,
      error: errorMsg
    });
    
    // small cooldown
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n--- Summary ---');
  const aliveText = results.filter(r => r.text === 'OK').length;
  const aliveJson = results.filter(r => r.json === 'OK').length;
  console.log(`${aliveText}/${pool.length} models can generate text.`);
  console.log(`${aliveJson}/${pool.length} models can generate structured JSON.`);
}

testModels().catch(console.error).finally(() => process.exit(0));
