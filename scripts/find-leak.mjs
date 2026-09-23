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

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 2 });

async function findAndFix() {
  const rows = await sql`
    SELECT id, title, company_name, source_url, employer_url
    FROM jobs
    WHERE employer_url ~* 'ajirayako|mwanampotevu|hotnigerianjobs|jobweb|mediacongo|jobinrwanda|jobinburundi|hiiraan|brightermonday'
  `;
  console.log('Found leaks:', rows);

  for (const r of rows) {
    console.log(`Fixing leak for job ID ${r.id}: ${r.employer_url}`);
    await sql`
      UPDATE jobs 
      SET employer_url = NULL, is_aggregator_source = true
      WHERE id = ${r.id}
    `;
    console.log(`Job ${r.id} cleansed.`);
  }

  await sql.end();
}

findAndFix();
