import postgres from "postgres";

// Try direct connection (port 5432, no pgbouncer)
const configs = [
  {
    label: "Pooler port 6543 (transaction)",
    host: "aws-0-ap-southeast-1.pooler.supabase.com",
    port: 6543,
    database: "postgres",
    username: "postgres.pywienffahvmylssnorr",
    password: "yQZ#D6x352i@B7",
    ssl: "require",
    max: 1,
    connect_timeout: 15,
    prepare: false,
  },
  {
    label: "Pooler port 5432 (session)",
    host: "aws-0-ap-southeast-1.pooler.supabase.com",
    port: 5432,
    database: "postgres",
    username: "postgres.pywienffahvmylssnorr",
    password: "yQZ#D6x352i@B7",
    ssl: "require",
    max: 1,
    connect_timeout: 15,
    prepare: false,
  },
  {
    label: "Direct DB host",
    host: "db.pywienffahvmylssnorr.supabase.co",
    port: 5432,
    database: "postgres",
    username: "postgres",
    password: "yQZ#D6x352i@B7",
    ssl: "require",
    max: 1,
    connect_timeout: 15,
    prepare: false,
  },
];

for (const cfg of configs) {
  const { label, ...opts } = cfg;
  console.log("\nTrying: " + label);
  const sql = postgres(opts);
  try {
    const r = await sql`SELECT COUNT(*) as cnt FROM jobs`;
    console.log("  ✓ OK! Jobs count:", r[0].cnt);
    await sql.end();
    break;
  } catch(e) {
    console.log("  ✗ FAILED:", e.message);
    await sql.end().catch(()=>{});
  }
}
