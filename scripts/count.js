import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');

async function run() {
  try {
    const [tendersRes] = await sql`SELECT count(*) FROM tenders`;
    const [jobsRes] = await sql`SELECT count(*) FROM jobs WHERE is_active = true`;
    const [businessesRes] = await sql`SELECT count(*) FROM businesses WHERE status = 'active'`;
    
    const tenders = parseInt(tendersRes.count);
    const jobs = parseInt(jobsRes.count);
    const businesses = parseInt(businessesRes.count);
    const staticPages = 16;
    
    const total = tenders + jobs + businesses + staticPages;
    
    console.log(`Tenders: ${tenders}`);
    console.log(`Jobs: ${jobs}`);
    console.log(`Businesses: ${businesses}`);
    console.log(`Static Pages: ${staticPages}`);
    console.log(`---`);
    console.log(`TOTAL URLs: ${total}`);
  } catch(e) {
    console.error(e);
  } finally {
    await sql.end();
  }
}

run();
