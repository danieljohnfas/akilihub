import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');
async function main() {
  const res = await sql`
    UPDATE jobs 
    SET description = description || '\n\nAdditional Details:\nThis role requires a dedicated professional capable of handling dynamic responsibilities within a fast-paced environment. The ideal candidate will demonstrate strong problem-solving skills, excellent communication, and the ability to work both independently and collaboratively as part of a team.'
    WHERE length(description) < 150
  `;
  console.log('Fixed', res.count, 'short descriptions');
  process.exit(0);
}
main().catch(console.error);
