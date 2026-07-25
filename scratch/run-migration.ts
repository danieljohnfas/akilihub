import { config } from 'dotenv';
import postgres from 'postgres';
import * as fs from 'fs';

config({ path: '.env.local' });

async function run() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 1 });
  
  try {
    const file = fs.readFileSync('drizzle/migrations/0010_chilly_kulan_gath.sql', 'utf-8');
    const statements = file.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0);
    
    for (const stmt of statements) {
      try {
        console.log(`Executing: ${stmt.substring(0, 50)}...`);
        await sql.unsafe(stmt);
        console.log('Success.');
      } catch (err: any) {
        // Ignore "already exists" and "duplicate column" errors
        if (err.code === '42710' || err.code === '42P07' || err.code === '42701') {
          console.log(`Skipped (already exists).`);
        } else {
          console.error(`Error:`, err.message);
        }
      }
    }
    
    console.log('All migrations processed!');
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}
run();
