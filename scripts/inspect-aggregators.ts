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

async function inspectAggregators() {
  const sources = [
    { name: 'myjobmag', query: sql`SELECT id, title, company_name, source_url FROM jobs WHERE source_url LIKE '%myjobmag.co.ke%' LIMIT 3;` },
    { name: 'jobinrwanda', query: sql`SELECT id, title, company_name, source_url FROM jobs WHERE source_url LIKE '%jobinrwanda.com%' LIMIT 3;` },
    { name: 'africareers', query: sql`SELECT id, title, company_name, source_url FROM jobs WHERE source_url LIKE '%africareers.net%' LIMIT 3;` },
    { name: 'reliefweb', query: sql`SELECT id, title, company_name, source_url FROM jobs WHERE source_url LIKE '%reliefweb.int%' LIMIT 3;` },
  ];

  for (const s of sources) {
    console.log(`\n================== TESTING ${s.name.toUpperCase()} ==================`);
    const rows = await db.execute(s.query);
    for (const r of rows) {
      const url = r.source_url as string;
      console.log(`\nJob: ${r.title} @ ${r.company_name}`);
      console.log(`URL: ${url}`);
      try {
        const resp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          }
        });
        const html = await resp.text();
        const $ = cheerio.load(html);

        console.log(`  Page Title: ${$('title').text().trim()}`);
        console.log('  Outbound links:');
        $('a[href]').each((i, el) => {
          const href = $(el).attr('href') || '';
          const text = $(el).text().trim().replace(/\s+/g, ' ');
          if (href.startsWith('http') && !href.includes(new URL(url).hostname)) {
            console.log(`    - [${text.slice(0, 40)}] -> ${href}`);
          }
        });
      } catch (e) {
        console.log(`  Error: ${(e as Error).message}`);
      }
    }
  }

  process.exit(0);
}

inspectAggregators();
