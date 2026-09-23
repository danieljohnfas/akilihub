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

async function inspectShortDesc() {
  const shortJobs = await sql`
    SELECT id, title, company_name, length(description) as len, description, source_url
    FROM jobs
    WHERE length(description) < 100
  `;
  console.log(`Found ${shortJobs.length} short jobs:`);
  console.table(shortJobs.map(j => ({ id: j.id, title: j.title, len: j.len, desc: j.description.slice(0, 50), source: j.source_url })));

  if (shortJobs.length > 0) {
    const deleted = await sql`
      DELETE FROM jobs
      WHERE length(description) < 100
      RETURNING id
    `;
    console.log(`Pruned ${deleted.length} jobs below minimum description standard (<100 chars).`);
  }

  await sql.end();
}

inspectShortDesc();
