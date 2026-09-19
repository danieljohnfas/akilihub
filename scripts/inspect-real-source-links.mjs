import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = vals.join('=').trim();
      }
    }
  }
}

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 3 });
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function inspectRealUrls() {
  const sources = [
    { name: 'Ajirayako', domain: 'ajirayako.co.tz' },
    { name: 'HotNigerianJobs', domain: 'hotnigerianjobs.com' },
    { name: 'JobWebKenya', domain: 'jobwebkenya.com' },
    { name: 'BrighterMonday Uganda', domain: 'brightermonday.co.ug' },
  ];

  for (const s of sources) {
    console.log(`\n======================================================`);
    console.log(`SOURCE: ${s.name}`);
    console.log(`======================================================`);
    const rows = await sql`
      SELECT id, title, company_name, source_url
      FROM jobs
      WHERE source_url LIKE ${'%' + s.domain + '%'}
      ORDER BY created_at DESC
      LIMIT 2
    `;

    for (const r of rows) {
      console.log(`\nJob: "${r.title}" at "${r.company_name}"`);
      console.log(`URL: ${r.source_url}`);
      try {
        const res = await fetch(r.source_url, {
          headers: { 'User-Agent': USER_AGENT },
          signal: AbortSignal.timeout(10000)
        });
        console.log(`Fetch HTTP Status: ${res.status}`);
        if (res.ok) {
          const html = await res.text();
          const $ = cheerio.load(html);

          // Look for outbound links
          const outbound = [];
          $('a').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim().replace(/\s+/g, ' ');
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
            if (href.includes(s.domain)) return; // skip internal links
            if (/whatsapp|facebook|twitter|instagram|linkedin|pinterest|telegram|t\.me/i.test(href)) return; // skip social
            if (/\.(css|js|png|jpe?g|gif|svg|ico)$/i.test(href)) return;

            outbound.push({ text: text.slice(0, 60), href });
          });

          console.log(`Found ${outbound.length} external outbound links:`);
          for (const o of outbound.slice(0, 8)) {
            console.log(`  -> [${o.text}] : ${o.href}`);
          }
        }
      } catch (err) {
        console.log(`Error: ${err.message}`);
      }
    }
  }

  await sql.end();
}

inspectRealUrls();
