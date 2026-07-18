import { keyPool } from '../src/lib/ai/key-pool';
import '../src/lib/ai/router'; // Load the keys
import { generateObject } from 'ai';
import { z } from 'zod';

async function main() {
  console.log("=== AI MODEL SCRAPER BENCHMARK ===");
  console.log("Testing each configured AI model for extraction performance...\n");

  const status = await keyPool.getStatus();
  const results = [];

  for (const key of status) {
    if (!key.supportsStructured) continue;
    
    // Get the actual model from the pool's private map
    // We hack into it for the benchmark
    const entry = (keyPool as any).keys.get(key.id);
    if (!entry) continue;

    console.log(`Testing [${key.name}]...`);
    
    const start = Date.now();
    try {
      const result = await generateObject({
        model: entry.model,
        schema: z.object({
          jobTitle: z.string(),
          company: z.string()
        }),
        prompt: "Extract the job: Software Engineer at Google.",
        maxRetries: 0
      });
      const latencyMs = Date.now() - start;
      results.push({
        "Model": key.name,
        "Status": "✅ Success",
        "Latency": `${latencyMs} ms`,
        "Extracted": `${result.object.jobTitle} @ ${result.object.company}`
      });
      // Mark success to populate telemetry
      await keyPool.markSuccess(key.id);
    } catch (e: any) {
      const latencyMs = Date.now() - start;
      results.push({
        "Model": key.name,
        "Status": "❌ Failed",
        "Latency": `${latencyMs} ms`,
        "Extracted": e.message.substring(0, 50) + "..."
      });
      await keyPool.markFailed(key.id);
    }
  }

  console.log("\n=== BENCHMARK RESULTS ===");
  console.table(results);
  process.exit(0);
}

main().catch(console.error);
