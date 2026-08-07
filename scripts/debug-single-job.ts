import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as cheerio from 'cheerio';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const isCloudDb = dbUrl.includes('supabase.com') || dbUrl.includes('neon.tech') || dbUrl.includes('pooler.supabase.com');
const conn = postgres(dbUrl, {
  ssl: isCloudDb || process.env.NODE_ENV === 'production' ? 'require' : false,
  max: 5,
});
const db = drizzle(conn);

async function checkJob() {
  const unresolved = await db.execute(sql`
    SELECT
      substring(source_url from 'https?://(?:www\.)?([^/]+)') as domain,
      COUNT(*)::int as count,
      array_agg(source_url) FILTER (WHERE source_url IS NOT NULL) as sample_urls
    FROM jobs
    WHERE employer_url IS NULL
    GROUP BY domain
    ORDER BY count DESC;
  `);

  console.log('--- TOP 15 UNRESOLVED SOURCE DOMAINS ---');
  for (const row of unresolved.slice(0, 15)) {
    const sample = (row.sample_urls as string[])?.slice(0, 1);
    console.log(`• ${row.domain?.padEnd(30)} | ${row.count.toString().padStart(5)} jobs | Sample: ${sample?.[0]}`);
  }

  process.exit(0);
}

checkJob();

