/**
 * Quick test: see which government portal APIs are actually reachable
 * Run with: npx tsx src/lib/scrapers/test-apis.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

const endpoints = [
  // Tanzania PPRA / NeST
  'https://data.nest.go.tz/api/ocds/tenders/?format=json&status=active&page_size=5',
  'https://data.nest.go.tz/ocds/releases/?format=json&limit=5',
  // Kenya tenders.go.ke
  `https://tenders.go.ke/ocds/bulk-download/json/${new Date().getFullYear()}`,
  'https://tenders.go.ke/website/tenders/index',
  // Uganda GPP
  'https://gpp.ppda.go.ug/api/v1/tenders?status=active&format=json&limit=5',
  // Rwanda RPPA
  'https://rppa.gov.rw/index.php/public-tenders-information',
  // TRA calculators
  'https://www.tra.go.tz/index.php/calculators',
  // KRA
  'https://www.kra.go.ke/individual/downloads',
  // BRELA
  'https://www.brela.go.tz/index.php/companies/forms',
];

async function testEndpoint(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Accept': 'text/html,application/json,*/*',
      },
      signal: AbortSignal.timeout(15_000),
    });
    const ct = res.headers.get('content-type') ?? '';
    const body = await res.text();
    console.log(`✅ [${res.status}] ${url}`);
    console.log(`   Content-Type: ${ct}`);
    console.log(`   Body size: ${body.length} bytes`);
    console.log(`   Preview: ${body.slice(0, 150).replace(/\s+/g, ' ')}`);
  } catch (err: any) {
    console.log(`❌ [FAIL] ${url}`);
    console.log(`   Error: ${err.message}`);
  }
  console.log('');
}

async function main() {
  console.log('Testing government portal API endpoints...\n');
  for (const url of endpoints) {
    await testEndpoint(url);
  }
}

main();
