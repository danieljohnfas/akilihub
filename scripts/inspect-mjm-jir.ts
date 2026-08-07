import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as cheerio from 'cheerio';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const conn = postgres(dbUrl, {
  ssl: dbUrl.includes('supabase.com') || dbUrl.includes('neon.tech') || dbUrl.includes('pooler.supabase.com') ? 'require' : false,
  max: 5,
});
const db = drizzle(conn);

async function inspectMyJobMagAndJobInRwanda() {
  const mjm = await db.execute(sql`SELECT id, title, company_name, source_url FROM jobs WHERE source_url LIKE '%myjobmag.co.ke%' LIMIT 3;`);
  for (const r of mjm) {
    console.log(`\n--- MJM: ${r.title} @ ${r.company_name} ---`);
    console.log(`URL: ${r.source_url}`);
    const resp = await fetch(r.source_url as string, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await resp.text();
    const $ = cheerio.load(html);
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (href.startsWith('http') && !href.includes('myjobmag')) {
        console.log(`  - [${text.slice(0, 40)}] -> ${href}`);
      }
    });
    // Check if there is an apply form or button with data attribute
    $('form, button, div.read-more, a.read-more, .apply-button, #apply-button, .job-apply').each((i, el) => {
      console.log(`  Element ${el.tagName}:`, el.attribs);
    });
  }

  const jir = await db.execute(sql`SELECT id, title, company_name, source_url FROM jobs WHERE source_url LIKE '%jobinrwanda.com%' LIMIT 3;`);
  for (const r of jir) {
    console.log(`\n--- JIR: ${r.title} @ ${r.company_name} ---`);
    console.log(`URL: ${r.source_url}`);
    const resp = await fetch(r.source_url as string, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await resp.text();
    const $ = cheerio.load(html);
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (href.startsWith('http') && !href.includes('jobinrwanda')) {
        console.log(`  - [${text.slice(0, 40)}] -> ${href}`);
      }
    });
  }

  process.exit(0);
}

inspectMyJobMagAndJobInRwanda();
