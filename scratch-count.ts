import { db } from './src/lib/db/client';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const jobs = await db.execute(sql`SELECT COUNT(*) as count FROM jobs`);
    const tenders = await db.execute(sql`SELECT COUNT(*) as count FROM tenders`);
    const compliance = await db.execute(sql`SELECT COUNT(*) as count FROM compliance_requirements`);
    const health = await db.execute(sql`SELECT COUNT(*) as count FROM health_data_points`);
    
    console.log('--- DATABASE RECORD COUNTS ---');
    console.log('Jobs:', jobs[0].count);
    console.log('Tenders:', tenders[0].count);
    console.log('Compliance:', compliance[0].count);
    console.log('Health:', health[0].count);
    
    const total = Number(jobs[0].count) + Number(tenders[0].count) + Number(compliance[0].count) + Number(health[0].count);
    console.log('TOTAL RECORDS:', total);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
