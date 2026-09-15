import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const conn = postgres(dbUrl, { max: 5 });
const db = drizzle(conn);

async function checkDataStandards() {
  console.log('🔍 COMMENCING DATA STANDARDS AUDIT...\n');

  const jobsMissing = await db.execute(sql`
    SELECT COUNT(*) as missing_descriptions
    FROM jobs
    WHERE description IS NULL OR length(trim(description)) < 10;
  `);
  console.log('Jobs missing description:', jobsMissing[0].missing_descriptions);

  const tendersMissing = await db.execute(sql`
    SELECT COUNT(*) as missing_descriptions
    FROM tenders
    WHERE description IS NULL OR length(trim(description)) < 10;
  `);
  console.log('Tenders missing description:', tendersMissing[0].missing_descriptions);

  const complianceMissing = await db.execute(sql`
    SELECT COUNT(*) as missing_descriptions
    FROM compliance_requirements
    WHERE description IS NULL OR length(trim(description)) < 10;
  `);
  console.log('Compliance missing description:', complianceMissing[0].missing_descriptions);

  process.exit(0);
}

checkDataStandards().catch(e => {
  console.error(e);
  process.exit(1);
});
