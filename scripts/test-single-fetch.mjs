import postgres from 'postgres';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
let dbUrl = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) dbUrl = line.split('=')[1].trim();
}
const sql = postgres(dbUrl + '?sslmode=require');

const enums = await sql`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'job_type'`;
console.log('Valid job_type enums:', enums);

const existingJobs = await sql`SELECT DISTINCT job_type FROM jobs LIMIT 10`;
console.log('Existing job_types in jobs table:', existingJobs);

await sql.end();
