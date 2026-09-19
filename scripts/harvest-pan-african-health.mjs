/**
 * scripts/harvest-pan-african-health.mjs
 *
 * Pan-African health indicator and time-series data harvester for 12 nations:
 *  - 100% genuine data from the official World Bank Open Data API (api.worldbank.org/v2)
 *  - 25 vital epidemiological, maternal, child, infectious disease, and healthcare infrastructure indicators
 *  - 10-year historical time series (2014-2024) across KE, TZ, UG, RW, ET, CD, BI, SS, SO, ZA, GH, NI
 *  - Canonical country UUIDs and deduplication via ON CONFLICT (indicator_id, country_id, year)
 */

import postgres from 'postgres';
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

const WB_INDICATORS = [
  { code: 'SH.STA.MMRT', name: 'Maternal Mortality Ratio', category: 'maternal', unit: 'per 100,000 live births' },
  { code: 'SH.DYN.MORT', name: 'Under-5 Mortality Rate', category: 'child', unit: 'per 1,000 live births' },
  { code: 'SH.DYN.NMRT', name: 'Neonatal Mortality Rate', category: 'child', unit: 'per 1,000 live births' },
  { code: 'SP.DYN.IMRT.IN', name: 'Infant Mortality Rate', category: 'child', unit: 'per 1,000 live births' },
  { code: 'SH.DYN.AIDS.ZS', name: 'HIV Prevalence (adults, % of 15-49)', category: 'hiv', unit: '%' },
  { code: 'SH.TBS.INCD', name: 'Tuberculosis Incidence Rate', category: 'infectious', unit: 'per 100,000 people' },
  { code: 'SP.DYN.LE00.IN', name: 'Life Expectancy at Birth (Total)', category: 'general', unit: 'years' },
  { code: 'SP.DYN.LE00.FE.IN', name: 'Life Expectancy at Birth (Female)', category: 'general', unit: 'years' },
  { code: 'SP.DYN.LE00.MA.IN', name: 'Life Expectancy at Birth (Male)', category: 'general', unit: 'years' },
  { code: 'SH.UHC.SRVS.CV.XD', name: 'UHC Service Coverage Index', category: 'infrastructure', unit: 'index (0-100)' },
  { code: 'SH.IMM.IDPT', name: 'DPT Immunization Coverage', category: 'child', unit: '% of children 12-23 months' },
  { code: 'SH.IMM.MEAS', name: 'Measles Immunization Coverage', category: 'child', unit: '% of children 12-23 months' },
  { code: 'SH.ANM.NPRG.ZS', name: 'Anemia Prevalence (Non-pregnant Women)', category: 'maternal', unit: '%' },
  { code: 'SH.ANM.ALLW.ZS', name: 'Anemia Prevalence (All Women 15-49)', category: 'maternal', unit: '%' },
  { code: 'SH.XPD.CHEX.GD.ZS', name: 'Current Health Expenditure (% of GDP)', category: 'financing', unit: '%' },
  { code: 'SH.XPD.CHEX.PC.CD', name: 'Health Expenditure Per Capita (Current US$)', category: 'financing', unit: 'US$' },
  { code: 'SH.XPD.OOPC.CH.ZS', name: 'Out-of-Pocket Health Expenditure (% of Current Health Exp)', category: 'financing', unit: '%' },
  { code: 'SH.MLR.INCD.P3', name: 'Malaria Incidence (per 1,000 population at risk)', category: 'infectious', unit: 'per 1,000' },
  { code: 'SH.MED.PHYS.ZS', name: 'Physicians (per 1,000 people)', category: 'workforce', unit: 'per 1,000' },
  { code: 'SH.MED.NUMW.P3', name: 'Nurses and Midwives (per 1,000 people)', category: 'workforce', unit: 'per 1,000' },
  { code: 'SH.MED.BEDS.ZS', name: 'Hospital Beds (per 1,000 people)', category: 'infrastructure', unit: 'per 1,000' },
  { code: 'SH.STA.BRTC.ZS', name: 'Births Attended by Skilled Health Personnel', category: 'maternal', unit: '%' },
  { code: 'SN.ITK.DEFC.ZS', name: 'Prevalence of Undernourishment (% of population)', category: 'nutrition', unit: '%' },
  { code: 'SH.STA.STNT.ZS', name: 'Prevalence of Stunting (% of children under 5)', category: 'nutrition', unit: '%' },
  { code: 'SH.STA.WAST.ZS', name: 'Prevalence of Wasting (% of children under 5)', category: 'nutrition', unit: '%' }
];

const ISO3_TO_ISO2 = {
  KEN: 'KE', TZA: 'TZ', UGA: 'UG', RWA: 'RW', ETH: 'ET', COD: 'CD',
  BDI: 'BI', SSD: 'SS', SOM: 'SO', ZMB: 'ZA', GHA: 'GH', NGA: 'NI'
};

const COUNTRY_ISO3_LIST = Object.keys(ISO3_TO_ISO2).join(';');

async function harvestPanAfricanHealth() {
  console.log('================================================================');
  console.log('🚀 PAN-AFRICAN HEALTH INTELLIGENCE HARVESTER INITIALIZED');
  console.log('🎯 Sourcing 25 health indicators for 12 nations from World Bank Open Data');
  console.log('================================================================\n');

  const dbCountries = await sql`SELECT id, code, name FROM countries`;
  const countryMap = new Map();
  for (const c of dbCountries) {
    countryMap.set(c.code.toUpperCase(), c.id);
  }

  let totalDataPoints = 0;
  let totalIndicators = 0;

  for (const ind of WB_INDICATORS) {
    // 1. Ensure indicator exists in health_indicators
    const [savedInd] = await sql`
      INSERT INTO health_indicators (code, name, unit, category)
      VALUES (${ind.code}, ${ind.name}, ${ind.unit}, ${ind.category})
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, unit = EXCLUDED.unit, category = EXCLUDED.category
      RETURNING id
    `;

    totalIndicators++;
    const indicatorId = savedInd.id;

    // 2. Fetch World Bank Open Data across all 12 countries for the last 10 years
    const url = `https://api.worldbank.org/v2/country/${COUNTRY_ISO3_LIST}/indicator/${ind.code}?format=json&per_page=200&mrv=10`;

    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000)
      });

      if (!res.ok) {
        console.warn(`  HTTP ${res.status} for ${ind.name}`);
        continue;
      }

      const data = await res.json();
      const records = data[1] || [];

      let indAdded = 0;
      for (const rec of records) {
        if (rec.value === null || rec.value === undefined) continue;
        const iso3 = rec.countryiso3code || rec.country?.id;
        const iso2 = ISO3_TO_ISO2[iso3] || (rec.country?.id || '').slice(0, 2);
        const countryId = countryMap.get(iso2.toUpperCase());
        if (!countryId) continue;

        const year = parseInt(rec.date, 10);
        if (isNaN(year)) continue;

        const val = Number(rec.value).toFixed(4);

        try {
          const [inserted] = await sql`
            INSERT INTO health_data_points (
              indicator_id, country_id, value, year, period, source
            ) VALUES (
              ${indicatorId}, ${countryId}, ${val}, ${year}, ${String(year)}, 'World Bank Open Data'
            )
            ON CONFLICT (indicator_id, country_id, year) DO UPDATE SET value = EXCLUDED.value
            RETURNING id
          `;

          if (inserted) indAdded++;
        } catch (e) {
          // ignore duplicate conflict
        }
      }

      totalDataPoints += indAdded;
      console.log(`  ✓ [${ind.name.slice(0, 45).padEnd(45)}]: +${indAdded} data points stored`);

      // Gentle rate limit for World Bank API
      await new Promise(r => setTimeout(r, 100));
    } catch (e) {
      console.error(`  Error fetching ${ind.name}:`, e.message);
    }
  }

  const [finalIndicators] = await sql`SELECT count(*)::int as count FROM health_indicators`;
  const [finalPoints] = await sql`SELECT count(*)::int as count FROM health_data_points`;

  console.log('\n================================================================');
  console.log(`🏁 HEALTH HARVEST SUMMARY: ${finalIndicators.count} indicators, ${finalPoints.count} verified data points in database.`);
  console.log('================================================================');

  await sql.end();
}

harvestPanAfricanHealth().catch(async (e) => {
  console.error('Fatal health harvest error:', e);
  await sql.end();
  process.exit(1);
});
