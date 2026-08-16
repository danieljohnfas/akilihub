const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
  
  try {
    console.log("Adding region_id to jobs...");
    await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES regions(id);`;
    await sql`CREATE INDEX IF NOT EXISTS jobs_region_idx ON jobs (region_id);`;

    console.log("Adding needs_ai_extraction to jobs...");
    await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS needs_ai_extraction boolean NOT NULL DEFAULT false;`;
    await sql`CREATE INDEX IF NOT EXISTS jobs_needs_ai_idx ON jobs (needs_ai_extraction);`;

    console.log("Adding region_id to tenders...");
    await sql`ALTER TABLE tenders ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES regions(id);`;
    await sql`CREATE INDEX IF NOT EXISTS tenders_region_idx ON tenders (region_id);`;

    console.log("Adding region_id to users...");
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES regions(id);`;

    console.log("Adding region_id to user_alerts...");
    await sql`ALTER TABLE user_alerts ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES regions(id);`;

    console.log("Adding ai_summary to tenders...");
    await sql`ALTER TABLE tenders ADD COLUMN IF NOT EXISTS ai_summary text;`;

    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await sql.end();
  }
}

run();
