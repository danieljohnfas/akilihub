import { db } from '../src/lib/db/client';
import { sql } from 'drizzle-orm';

async function main() {
  console.log("Altering ai_telemetry to use BIGINT...");
  await db.execute(sql`
    ALTER TABLE ai_telemetry 
    ALTER COLUMN cool_until TYPE bigint,
    ALTER COLUMN last_used TYPE bigint;
  `);
  console.log("Done.");
  process.exit(0);
}

main().catch(console.error);
