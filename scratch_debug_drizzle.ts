import { db } from './src/lib/db/client';
import { countries } from './src/lib/db/schema/shared';

async function main() {
  try {
    const res = await db.select().from(countries).limit(1);
    console.log("Success:", res);
  } catch (err) {
    console.error("Drizzle Error:");
    console.error(err);
  }
  process.exit(0);
}

main();
