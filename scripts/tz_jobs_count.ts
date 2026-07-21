import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');

async function run() {
  try {
    const [res] = await sql`
      SELECT count(distinct source_url) 
      FROM jobs 
      INNER JOIN countries ON jobs.country_id = countries.id 
      WHERE countries.code = 'TZ'
    `;
    console.log(`Unique URLs for Tanzanian jobs: ${res.count}`);
  } catch(e) {
    console.error(e);
  } finally {
    await sql.end();
  }
}

run();
