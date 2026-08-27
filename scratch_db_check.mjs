import postgres from "postgres";
// Test both URL formats
const urls = [
  "postgresql://postgres.pywienffahvmylssnorr:6g3kJKx9u%40Sb%21Xn@aws-1-eu-central-1.pooler.supabase.com:6543/postgres",
  "postgresql://postgres.pywienffahvmylssnorr:6g3kJKx9u%40Sb!Xn@aws-1-eu-central-1.pooler.supabase.com:6543/postgres",
];
for (const url of urls) {
  try {
    const sql = postgres(url, { ssl: "require", max: 1, connect_timeout: 8 });
    const r = await sql`SELECT 1 as ok`;
    console.log("WORKS:", url.split("@")[1]);
    await sql.end();
  } catch(e) {
    console.log("FAILS:", url.split("@")[1], "->", e.message.slice(0, 60));
  }
}
