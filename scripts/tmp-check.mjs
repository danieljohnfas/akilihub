import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
let dbUrl = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.split('=').slice(1).join('=').trim();
  }
}

const sql = postgres(dbUrl + (dbUrl.includes('?') ? '&sslmode=require' : '?sslmode=require'), { max: 1 });

async function check() {
  const categories = await sql`SELECT * FROM job_categories LIMIT 1`;
  console.log('categories', categories);
  
  const subs = await sql`SELECT * FROM salary_submissions LIMIT 1`;
  console.log('subs', subs);
  
  await sql.end();
}
check();
