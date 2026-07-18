import { db } from '../src/lib/db/client';
import { sql } from 'drizzle-orm';

async function main() {
  console.log("Resetting all AI model cooldowns...");
  await db.execute(sql`
    UPDATE ai_telemetry 
    SET cool_until = 0, error_count = 0
    WHERE cool_until > 0;
  `);
  console.log("Done — all models reset.");
  process.exit(0);
}

main().catch(console.error);
