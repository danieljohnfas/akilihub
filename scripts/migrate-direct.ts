import postgres from 'postgres';

async function run() {
  const connectionString = 'postgresql://postgres.pywienffahvmylssnorr:Bagamoyo2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
  const sql = postgres(connectionString);

  try {
    console.log('Running migration...');
    await sql`ALTER TABLE "ai_telemetry" ALTER COLUMN "supports_structured" SET DEFAULT true;`;
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sql.end();
  }
}

run();
