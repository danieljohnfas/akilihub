import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

import { db } from '../src/lib/db/client';
import { sql } from 'drizzle-orm';

async function main() {
    console.log("Adding source_url column...");
    await db.execute(sql`ALTER TABLE salary_submissions ADD COLUMN IF NOT EXISTS source_url TEXT;`);
    console.log("Done adding column!");
    process.exit(0);
}
main().catch(console.error);
