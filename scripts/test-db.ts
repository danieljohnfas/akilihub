import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const url = process.env.DATABASE_URL!;
console.log("Connecting to:", new URL(url).hostname);

const sql = postgres(url, {
  ssl: "require",
  connect_timeout: 30,
  max: 1,
});

async function main() {
  try {
    const result = await sql`SELECT 1 as ping, now() as ts`;
    console.log("✅ DB OK:", result);
  } catch (e: any) {
    console.error("❌ DB ERROR:", e.message, "| code:", e.code);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
