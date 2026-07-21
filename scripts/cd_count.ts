import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');

async function run() {
  try {
    const [jobsRes] = await sql`
      SELECT count(*) 
      FROM jobs 
      INNER JOIN countries ON jobs.country_id = countries.id 
      WHERE countries.code = 'CD'
    `;
    const [tendersRes] = await sql`
      SELECT count(*) 
      FROM tenders 
      INNER JOIN countries ON tenders.country_id = countries.id 
      WHERE countries.code = 'CD'
    `;
    console.log(`DRC Jobs: ${jobsRes.count}`);
    console.log(`DRC Tenders: ${tendersRes.count}`);
  } catch(e) {
    console.error(e);
  } finally {
    await sql.end();
  }
}

run();
