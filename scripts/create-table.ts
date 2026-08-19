import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

require("dotenv").config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString!);
const db = drizzle(client);

async function main() {
  try {
    const { sql } = require("drizzle-orm");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "data_verification_log" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "record_id" uuid NOT NULL,
        "source_module" text NOT NULL,
        "target_module" text NOT NULL,
        "action_taken" text NOT NULL,
        "verified_at" timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("Table created successfully!");
  } catch (e) {
    console.error("DB ERROR:", e);
  } finally {
    process.exit(0);
  }
}

main();
