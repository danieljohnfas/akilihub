import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/lib/db/schema/index.js';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const queryClient = postgres(process.env.DATABASE_URL);
const db = drizzle(queryClient, { schema });

async function main() {
  try {
    const job = await db.query.jobs.findFirst({
      where: eq(schema.jobs.id, 'a5e115ee-3d22-4b1a-91c9-b6dbb61b136b')
    });
    console.log("Job Title:", job?.title);
    console.log("Job URL:", job?.url);
    console.log("Aggregator Source:", job?.isAggregatorSource);
    console.log("Shallow Title (what's stored):", job?.title);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
main();
