import { config } from 'dotenv'; config({ path: '.env.local' });
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
async function run() {
  await sql`INSERT INTO tenders (title, reference_no, contracting_authority, country_id, status, deadline, source_url) 
            SELECT 'Additional Tender ' || gen_random_uuid(), gen_random_uuid()::text, 'Acme Corp', 
            (SELECT id FROM countries WHERE code='KE' LIMIT 1), 'open', NOW() + interval '30 days', 'https://example.com/tender' 
            FROM generate_series(1, 250)`;
  console.log('Done!');
  process.exit(0);
}
run();
