import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = vals.join('=').trim();
      }
    }
  }
}

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 1 });

async function check() {
  const [ni] = await sql`SELECT count(*)::int as c FROM jobs WHERE country_id = (SELECT id FROM countries WHERE code = 'NI')`;
  const [hnj] = await sql`SELECT count(*)::int as c FROM jobs WHERE source_url LIKE '%hotnigerianjobs.com%'`;
  const [ug] = await sql`SELECT count(*)::int as c FROM jobs WHERE country_id = (SELECT id FROM countries WHERE code = 'UG')`;
  const [ke] = await sql`SELECT count(*)::int as c FROM jobs WHERE country_id = (SELECT id FROM countries WHERE code = 'KE')`;
  const [direct] = await sql`SELECT count(*)::int as c FROM jobs WHERE employer_url IS NOT NULL`;
  const [total] = await sql`SELECT count(*)::int as c FROM jobs`;
  console.log(JSON.stringify({ total: total.c, nigeria: ni.c, hnj: hnj.c, uganda: ug.c, kenya: ke.c, direct: direct.c }));
  await sql.end();
}
check();
