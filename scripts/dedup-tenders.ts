// SAFETY: this script deletes data. It refuses to run unless invoked with --apply,
// so a stray `tsx scripts/<name>` can never wipe rows. Read the SQL below first, and take a backup.
if (!process.argv.includes('--apply')) {
  console.error('Refusing to run: this script deletes data. Re-run with --apply after reviewing it.');
  process.exit(1);
}

import { db } from "../src/lib/db/client";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Step 1: Deduplicating tenders...");
  const del = await db.execute(sql`
    DELETE FROM tenders
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY title, contracting_authority, country_id
            ORDER BY length(coalesce(description, '')) DESC, created_at ASC
          ) AS rn
        FROM tenders
      ) ranked
      WHERE rn > 1
    )
  `);
  console.log("Deleted duplicate rows:", (del as any).rowCount);

  console.log("Step 2: Creating unique index...");
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS tenders_title_authority_country_udx
    ON tenders USING btree (title, contracting_authority, country_id)
  `);
  console.log("Index created successfully.");
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
