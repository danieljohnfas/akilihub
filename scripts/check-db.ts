import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema/admin";
import * as sharedSchema from "../src/lib/db/schema/shared";

require("dotenv").config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString!);
const db = drizzle(client, { schema: { ...schema, ...sharedSchema } });

async function main() {
  try {
    const logs = await db.select().from(schema.dataVerificationLog).limit(5);
    console.log("LOGS FOUND:", logs.length);
    console.log(logs);
    
    // Also count total
    const { sql } = require("drizzle-orm");
    const count = await db.select({ count: sql<number>`count(*)` }).from(schema.dataVerificationLog);
    console.log("TOTAL PROCESSED:", count[0].count);
    
  } catch (e) {
    console.error("DB ERROR:", e);
  } finally {
    process.exit(0);
  }
}

main();
