// SAFETY: this script deletes data. It refuses to run unless invoked with --apply,
// so a stray `tsx scripts/<name>` can never wipe rows. Read the SQL below first, and take a backup.
if (!process.argv.includes('--apply')) {
  console.error('Refusing to run: this script deletes data. Re-run with --apply after reviewing it.');
  process.exit(1);
}

import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

// Load .env.local
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

const DATABASE_URL = process.env.DATABASE_URL;
const sql = postgres(DATABASE_URL + '?sslmode=require', { max: 5 });

async function clean() {
  const deleted = await sql`
    DELETE FROM jobs
    WHERE title ILIKE '%successful candidates%'
       OR title ILIKE '%shortlisted candidates%'
       OR title ILIKE '%aptitude test%'
       OR title ILIKE '%past papers%'
       OR title ILIKE '%matokeo ya usaili%'
       OR title ILIKE '%interview results%'
       OR company_name ILIKE '%openings%'
       OR company_name ILIKE '%positions%'
       OR company_name ~* '^\d+'
       OR title ILIKE '%massive%recruitment%'
       OR title ILIKE '%nationwide job recruitment%'
       OR title ILIKE '%2027 general elections%'
    RETURNING id, title, company_name
  `;

  console.log(`Cleaned ${deleted.length} invalid non-vacancy records:`);
  deleted.forEach(d => console.log(`  - Deleted: "${d.title}"`));
  await sql.end();
}

clean();
