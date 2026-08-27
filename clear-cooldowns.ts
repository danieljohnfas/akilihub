import { db } from './src/lib/db';
import { aiTelemetry } from './src/lib/db/schema';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  await db.update(aiTelemetry).set({ status: 'active', resetTime: null });
  console.log('Cleared all AI cooldowns!');
  process.exit(0);
}
main();
