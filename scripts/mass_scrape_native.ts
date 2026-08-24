import { runKnownSourcesForCountryProxy, runQueriesForCountryProxy } from "../src/inngest/scrape-jobs";

const COUNTRIES = ['KE', 'TZ', 'UG', 'RW', 'ET', 'CD', 'BI', 'SO', 'SS'];
const JOB_QUERIES: Record<string, string[]> = {
  'KE': [
    "jobs hiring Nairobi Kenya 2026",
    "latest job vacancies Kenya NGO 2026",
    "government jobs Kenya PSC 2026"
  ],
  'TZ': [
    "ajira mpya Tanzania Dar es Salaam 2026",
    "jobs vacancies Tanzania 2026",
    "NGO jobs Tanzania 2026"
  ],
  // fallback for others to avoid making file too long
  'DEFAULT': [
    "latest NGO jobs 2026",
    "government jobs 2026"
  ]
};

const runMassScrape = async () => {
  console.log("=== STARTING MASS SCRAPE (JOBS) DIRECTLY ===");

  for (const country of COUNTRIES) {
    console.log(`\n\n--- Scraping Jobs for ${country} ---`);
    try {
      console.log(`Phase 1: Known Sources for ${country}`);
      const known = await runKnownSourcesForCountryProxy(country, `jobs-${country}-known`);
      console.log(`Phase 1 inserted: ${known}`);

      console.log(`Phase 2: Search Queries for ${country}`);
      const queries = JOB_QUERIES[country] || JOB_QUERIES['DEFAULT'].map(q => q + ' ' + country);
      const search = await runQueriesForCountryProxy(queries, country, `jobs-${country}-search`);
      console.log(`Phase 2 inserted: ${search}`);
      
      console.log(`Total for ${country}: ${known + search}`);
    } catch (e: any) {
      console.error(`Failed ${country}:`, e.message);
    }
  }
  
  console.log("=== DONE MASS SCRAPE (JOBS) ===");
};

runMassScrape().catch(console.error).finally(()=>process.exit(0));
