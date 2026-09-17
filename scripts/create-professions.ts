import postgres from 'postgres';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL! + '?sslmode=require', { max: 1 });

async function createTable() {
  console.log('Creating professions table...');
  await sql`
    CREATE TABLE IF NOT EXISTS "professions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" text NOT NULL UNIQUE,
      "automation_risk_score" numeric(4,2),
      "resilience_rationale" text,
      "upskilling_advice" text,
      "founder_opportunity" text,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now()
    );
  `;
  console.log('✅ Table created successfully.');
  process.exit(0);
}

createTable().catch((err) => {
  console.error(err);
  process.exit(1);
});
