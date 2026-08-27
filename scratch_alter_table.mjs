import postgres from "postgres";
const sql = postgres({
  host: "aws-1-eu-central-1.pooler.supabase.com",
  port: 6543, database: "postgres",
  username: "postgres.pywienffahvmylssnorr",
  password: "6g3kJKx9u@Sb!Xn",
  ssl: "require", max: 1, connect_timeout: 15
});

try {
  console.log("Adding missing columns to jobs table...");
  
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS sector text;`;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS profession text;`;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_level text;`;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS education_level text;`;
  await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS skills text[];`;

  console.log("Columns added successfully!");
  
  // Verify
  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='jobs' AND column_name IN ('sector', 'profession', 'experience_level', 'education_level', 'skills')`;
  console.log("Verified columns:");
  cols.forEach(c => console.log(` - ${c.column_name} (${c.data_type})`));
  
} catch(e) { 
  console.error("ERROR:", e.message); 
}
await sql.end();
