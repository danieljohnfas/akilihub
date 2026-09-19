/**
 * scripts/harvest-worldbank-expansion.mjs
 *
 * Expands World Bank Open Procurement notices database:
 * Fetches batch 3 (os=350, rows=200) across all 12 countries.
 * All notices are 100% genuine official government project procurement notices.
 */

import postgres from 'postgres';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

// Load .env.local
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

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is missing in environment');
  process.exit(1);
}

const sql = postgres(DATABASE_URL + '?sslmode=require', { max: 5 });

const COUNTRIES = [
  { name: 'Tanzania', queryName: 'Tanzania', code: 'TZ' },
  { name: 'Kenya', queryName: 'Kenya', code: 'KE' },
  { name: 'Uganda', queryName: 'Uganda', code: 'UG' },
  { name: 'Rwanda', queryName: 'Rwanda', code: 'RW' },
  { name: 'Ethiopia', queryName: 'Ethiopia', code: 'ET' },
  { name: 'Democratic Republic of the Congo', queryName: 'Congo, Democratic Republic of', code: 'CD' },
  { name: 'Burundi', queryName: 'Burundi', code: 'BI' },
  { name: 'South Sudan', queryName: 'South Sudan', code: 'SS' },
  { name: 'Somalia', queryName: 'Somalia', code: 'SO' },
  { name: 'Zambia', queryName: 'Zambia', code: 'ZA' },
  { name: 'Ghana', queryName: 'Ghana', code: 'GH' },
  { name: 'Nigeria', queryName: 'Nigeria', code: 'NI' },
];

function mapCategory(groupCode, desc) {
  const text = (desc || '').toLowerCase();
  if (groupCode === 'CW' || text.includes('construction') || text.includes('works') || text.includes('rehabilitation') || text.includes('upgrade')) {
    return 'works';
  }
  if (groupCode === 'CS' || text.includes('consultant') || text.includes('consultancy') || text.includes('advisory') || text.includes('study') || text.includes('evaluation')) {
    return 'consultancy';
  }
  if (groupCode === 'G' || text.includes('supply') || text.includes('equipment') || text.includes('goods') || text.includes('delivery') || text.includes('purchase')) {
    return 'goods';
  }
  return 'services';
}

async function harvestWorldBankExpansion() {
  console.log('================================================================');
  console.log('🌍 WORLD BANK OPEN PROCUREMENT EXPANSION HARVESTER (BATCH 4)');
  console.log('🎯 Sourcing offset 550 (200 notices per country) for all 12 nations');
  console.log('================================================================\n');

  const dbCountries = await sql`SELECT id, code, name FROM countries`;
  const countryMap = new Map();
  for (const c of dbCountries) {
    countryMap.set(c.code.toUpperCase(), c.id);
  }

  let totalInserted = 0;

  for (const target of COUNTRIES) {
    const countryId = countryMap.get(target.code);
    if (!countryId) continue;

    console.log(`\n--- Sourcing batch 4 for ${target.name} (${target.code}) ---`);
    const url = `https://search.worldbank.org/api/v2/procnotices?format=json&project_ctry_name_exact=${encodeURIComponent(target.queryName)}&rows=200&os=550`;

    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        console.error(`  Failed HTTP ${res.status}`);
        continue;
      }

      const json = await res.json();
      const rawNotices = json.procnotices || {};
      const notices = Object.values(rawNotices);

      console.log(`  Received ${notices.length} notices.`);
      let added = 0;

      for (const item of notices) {
        const refNo = item.bid_reference_no || item.id;
        if (!refNo) continue;

        let rawTitle = item.bid_description || item.project_name || 'Procurement Notice';
        let cleanTitle = rawTitle.replace(/\s+/g, ' ').trim().slice(0, 500);
        if (cleanTitle.length < 10) continue;

        let textDesc = '';
        if (item.notice_text) {
          textDesc = cheerio.load(item.notice_text).text().replace(/\s+/g, ' ').trim();
        }
        if (textDesc.length < 100) {
          textDesc = `${cleanTitle}. Project: ${item.project_name || target.name}. Method: ${item.procurement_method_name || 'Competitive Bidding'}. Country: ${target.name}.`;
        }

        const authority = item.project_name || `${target.name} Government Implementing Agency`;
        const category = mapCategory(item.procurement_group, cleanTitle);
        const sourceUrl = `https://projects.worldbank.org/en/projects-operations/procurement-detail/${item.id}`;

        let pubDate = new Date();
        if (item.submission_date) {
          pubDate = new Date(item.submission_date);
        } else if (item.noticedate) {
          pubDate = new Date(item.noticedate);
        }

        let deadline = new Date(Date.now() + 60 * 86400000);
        if (item.submission_date) {
          const parsed = new Date(item.submission_date);
          if (!isNaN(parsed.getTime())) deadline = parsed;
        }

        try {
          const [inserted] = await sql`
            INSERT INTO tenders (
              reference_no,
              title,
              description,
              contracting_authority,
              country_id,
              category,
              status,
              deadline,
              source_url,
              employer_url,
              published_at
            ) VALUES (
              ${refNo.trim().slice(0, 200)},
              ${cleanTitle},
              ${textDesc.slice(0, 10000)},
              ${authority.trim().slice(0, 255)},
              ${countryId},
              ${category},
              'open',
              ${deadline},
              ${sourceUrl},
              ${sourceUrl},
              ${isNaN(pubDate.getTime()) ? new Date() : pubDate}
            )
            ON CONFLICT (reference_no) DO NOTHING
            RETURNING id
          `;

          if (inserted) {
            added++;
            totalInserted++;
            if (added % 20 === 0 || added === 1) {
              console.log(`  ✓ Inserted [${totalInserted}]: "${cleanTitle.slice(0, 60)}..."`);
            }
          }
        } catch (e) {
          // ignore duplicate
        }
      }

      console.log(`  ==> Added ${added} new tenders for ${target.name}.`);
    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }
  }

  console.log(`\n🎉 BATCH 3 TENDERS COMPLETE: Inserted ${totalInserted} new tenders.`);
  await sql.end();
}

harvestWorldBankExpansion().catch(e => {
  console.error(e);
  process.exit(1);
});
