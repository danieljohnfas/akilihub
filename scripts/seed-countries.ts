import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { countries } from '../src/lib/db/schema/shared';

const client = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 1 });
const db = drizzle(client);

async function main() {
  const targetCountries = ["Tanzania", "Kenya", "Uganda", "Rwanda", "Ghana", "Nigeria", "Zambia", "South Africa", "Ethiopia"];
  
  for (const name of targetCountries) {
    await db.insert(countries).values({
      name,
      code: name.substring(0, 2).toUpperCase()
    }).onConflictDoNothing();
  }
  
  const all = await db.select().from(countries);
  console.log(all);
}

main().then(() => process.exit(0));
