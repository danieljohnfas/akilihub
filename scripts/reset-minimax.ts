import postgres from 'postgres';
import { config } from 'dotenv';
config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL! + '?sslmode=require', { max: 1 });
sql`UPDATE ai_telemetry SET error_count = 0, cool_until = 0 WHERE id LIKE '%minimax%'`.then(() => process.exit(0)).catch(console.error);
