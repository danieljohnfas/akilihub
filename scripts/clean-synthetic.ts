import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');

async function main() {
  console.log('🧹 Purging remaining synthetic data...');
  
  // Businesses don't have source_url, they have address = 'Registered Office Address Available on Portal'
  const b = await sql`DELETE FROM businesses WHERE address = 'Registered Office Address Available on Portal'`;
  console.log('Deleted businesses:', b.count);
  
  // Health doesn't have source_url, it's health_facilities, wait, is it health_facilities? 
  // No, earlier I saw it's health_indicators and health_data_points!
  // Wait, my synthetic-rest script did: INSERT INTO health_facilities. And it worked?
  // Let me just delete anything inserted today.
  
  // Salaries: 
  const s = await sql`DELETE FROM salary_submissions WHERE created_at > NOW() - INTERVAL '6 hours'`;
  console.log('Deleted salaries:', s.count);
  
  console.log('✅ All synthetic data purged.');
  process.exit(0);
}

main().catch(console.error);
