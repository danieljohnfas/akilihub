import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const url = process.env.DATABASE_URL!;
const sql = postgres(url.includes('sslmode=require') ? url : url + '?sslmode=require', { max: 1 });

async function main() {
  console.log('Running employer_url migration...');
  const migrationPath = path.join(process.cwd(), 'drizzle/migrations/0015_employer_url.sql');
  const sqlContent = fs.readFileSync(migrationPath, 'utf8');

  const statements = sqlContent
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      await sql.unsafe(statement);
      console.log('✓ Executed:', statement.slice(0, 80).replace(/\n/g, ' ') + '...');
    } catch (e: any) {
      if (e.message && (e.message.includes('already exists') || e.message.includes('does not exist'))) {
        console.log('⚠ Skipped (already applied):', statement.slice(0, 60) + '...');
      } else {
        throw e;
      }
    }
  }

  console.log('✅ employer_url migration complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Migration failed!', err);
  process.exit(1);
});
