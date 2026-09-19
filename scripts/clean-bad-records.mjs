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
const sql = postgres(DATABASE_URL + '?sslmode=require', { max: 2 });

async function clean() {
  const deleted = await sql`
    DELETE FROM jobs 
    WHERE company_name ILIKE '%Set Filter%' 
       OR company_name ILIKE '%GOODY Bag%'
       OR title ILIKE '%GOODY Bag%'
       OR title ILIKE '%Digest%'
       OR title ILIKE '%HotNigerianJobs%'
    RETURNING id, title, company_name
  `;
  console.log(`Cleaned ${deleted.length} invalid/digest records:`);
  for (const d of deleted) {
    console.log(`  - Deleted: "${d.title}" (${d.company_name})`);
  }
  await sql.end();
}

clean().catch(e => {
  console.error(e);
  process.exit(1);
});
