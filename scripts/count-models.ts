import '../src/lib/ai/router';
import { keyPool } from '../src/lib/ai/key-pool';

async function main() {
  await new Promise(r => setTimeout(r, 300));
  console.log(`\n✅ Total AI models loaded: ${keyPool.size}\n`);
  process.exit(0);
}
main();
