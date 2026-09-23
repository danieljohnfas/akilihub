import postgres from 'postgres';
import * as cheerio from 'cheerio';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
let dbUrl = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) dbUrl = line.split('=')[1].trim();
}
const sql = postgres(dbUrl + '?sslmode=require');

const res = await fetch('https://jobwebzambia.com/jobs/page/191/', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
});

const html = await res.text();
const $ = cheerio.load(html);
const links = [];
$('a[href*="/jobs/"]').each((i, el) => {
  const href = $(el).attr('href');
  if (href && !href.includes('/page/') && !href.endsWith('/jobs/')) {
    links.push(href);
  }
});

console.log('Total links found on p191:', links.length);
if (links.length > 0) {
  const sample = links[0];
  console.log('Sample link:', sample);
  const rows = await sql`SELECT id, title, employer_url FROM jobs WHERE source_url = ${sample}`;
  console.log('DB row for sample:', rows);
}

await sql.end();
