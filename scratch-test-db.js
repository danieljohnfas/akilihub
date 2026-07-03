const postgres = require('postgres');

async function testConnection(url, name) {
  try {
    const sql = postgres(url, { max: 1, connect_timeout: 5, ssl: 'require' });
    const [{ '?column?': result }] = await sql`SELECT 1`;
    console.log(`[SUCCESS] ${name} connected! Result:`, result);
    await sql.end();
  } catch (err) {
    console.error(`[ERROR] ${name} failed:`, err.message);
  }
}

async function run() {
  const dbUrl5432 = "postgresql://postgres.pywienffahvmylssnorr:6g3kJKx9u%40Sb%21Xn@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";
  const dbUrl6543 = "postgresql://postgres.pywienffahvmylssnorr:6g3kJKx9u%40Sb%21Xn@aws-1-eu-central-1.pooler.supabase.com:6543/postgres";
  const directUrl6543 = "postgresql://postgres.pywienffahvmylssnorr:6g3kJKx9u%40Sb%21Xn@db.pywienffahvmylssnorr.supabase.co:5432/postgres";
  
  console.log("Testing port 5432 on pooler...");
  await testConnection(dbUrl5432, "DATABASE_URL (Pooler 5432)");
  
  console.log("Testing port 6543 on pooler...");
  await testConnection(dbUrl6543, "DIRECT_URL (Pooler 6543)");
  
  console.log("Testing direct DB host on port 5432...");
  await testConnection(directUrl6543, "Direct DB host 5432");
}

run();
