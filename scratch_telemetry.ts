import { db } from './src/lib/db/client';
import { aiTelemetry } from './src/lib/db/schema/ai';
async function run() {
  const data = await db.select().from(aiTelemetry);
  console.log(data);
  process.exit(0);
}
run();
