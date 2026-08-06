import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');

async function run() {
  try {
    const [guidesRes] = await sql`SELECT count(*) FROM guides`;
    const [compRes] = await sql`SELECT count(*) FROM compliance_requirements`;
    const [bizRes] = await sql`SELECT count(*) FROM businesses`;
    const sampleGuides = await sql`SELECT slug, title, category, reading_time_minutes, is_published FROM guides LIMIT 10`;
    console.log(`Published Guides: ${guidesRes.count}`);
    console.log(`Compliance Requirements: ${compRes.count}`);
    console.log(`Businesses: ${bizRes.count}`);
    console.log(`Sample Guides:`, sampleGuides);
  } catch(e) {
    console.error(e);
  } finally {
    await sql.end();
  }
}

run();
