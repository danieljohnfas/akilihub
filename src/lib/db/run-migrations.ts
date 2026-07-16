import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const url = process.env.DATABASE_URL!;
const sql = postgres(url.includes('sslmode=require') ? url : url + '?sslmode=require', { max: 1 });

async function main() {
  console.log('Running raw SQL migration...');
  const migrationPath = path.join(process.cwd(), 'drizzle/migrations/0005_ordinary_jack_murdock.sql');
  const sqlContent = fs.readFileSync(migrationPath, 'utf8');
  
  // Split by statement breakpoint
  const statements = sqlContent.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0);
  
  for (const statement of statements) {
    try {
      await sql.unsafe(statement);
      console.log('Executed:', statement.slice(0, 50) + '...');
    } catch (e: any) {
      if (e.message && (e.message.includes('already exists') || e.message.includes('does not exist'))) {
        console.log('Skipping (already exists / does not exist):', statement.slice(0, 50) + '...');
      } else {
        throw e;
      }
    }
  }

  console.log('Raw SQL migration complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('Raw Migration failed!', err);
  process.exit(1);
});
