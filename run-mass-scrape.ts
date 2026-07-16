import { config } from 'dotenv';
config({ path: '.env.local' });

import { scrapePPRATanzaniaJob } from './src/inngest/scrape-tenders';
import { scrapeJobsKenyaJob } from './src/inngest/scrape-jobs';
import { scrapeTRAResourcesJob } from './src/inngest/scrape-compliance';
import { discoverTenders } from './src/lib/scrapers/broad-search-engine-tenders';
import { discoverJobs } from './src/lib/scrapers/broad-search-engine';
import { discoverCompliance } from './src/lib/scrapers/broad-search-engine-compliance';
import { db } from './src/lib/db/client';
import { tenders } from './src/lib/db/schema/tenders';
import { jobs } from './src/lib/db/schema/jobs';
import { complianceRequirements } from './src/lib/db/schema/compliance';
import { count } from 'drizzle-orm';
import { ScraplingStrategy, FirecrawlStrategy, CrawleeStrategy } from './src/lib/strategies/scraper-strategies';
import { StrategyEngine } from './src/lib/strategies/engine';
import { saveJobs } from './src/inngest/scrape-jobs';
import { saveCompliance } from './src/inngest/scrape-compliance';
import { saveTenderResults, saveBroadResults, getCountryId } from './src/inngest/scrape-tenders';

function buildStrategyEngine() {
  return new StrategyEngine([
    new ScraplingStrategy(),
    new FirecrawlStrategy(),
    new CrawleeStrategy(),
  ]);
}

async function main() {
  console.log("==========================================");
  console.log("🚀 STARTING MASS SCRAPE ITERATION (TEST) 🚀");
  console.log("==========================================\n");

  const stats = {
    tenders: { found: 0, before: 0, after: 0 },
    jobs: { found: 0 },
    compliance: { found: 0 }
  };

  const countries = [
    { code: "TZ", name: "Tanzania" },
    { code: "KE", name: "Kenya" },
    { code: "UG", name: "Uganda" },
    { code: "RW", name: "Rwanda" },
    { code: "ET", name: "Ethiopia" },
    { code: "CD", name: "Congo DRC" },
  ];

  console.log("==========================================");
  console.log("🚀 STARTING MASS SCRAPE FOR ALL COUNTRIES 🚀");
  console.log("==========================================\n");

  const engine = buildStrategyEngine();

  // 1. TENDERS
  console.log("--- 1. Testing Tenders (Strategy Engine Cascade) ---");
  const tenderPortals = [
    { portalType: "ppra_tz", url: "https://www.ppra.go.tz/tenders", code: "TZ" },
    { portalType: "ppoa_ke", url: "https://tenders.go.ke/tenders/open", code: "KE" },
    { portalType: "ppda_ug", url: "https://gpp.ppda.go.ug/public/bid-invitations", code: "UG" },
    { portalType: "rppa_rw", url: "https://www.rppa.gov.rw/index.php?id=33", code: "RW" },
    { portalType: "pppa_et", url: "https://www.pppa.gov.et/index.php/procurement-opportunities", code: "ET" },
    { portalType: "armp_cd", url: "https://www.armp.cd/index.php/appels-doffres", code: "CD" },
  ];

  for (const portal of tenderPortals) {
    try {
      console.log(`\n[Tenders] Scraping ${portal.portalType} for ${portal.code}...`);
      const { result, strategyUsed } = await engine.executeWithFallback({
        url: portal.url,
        portalType: portal.portalType as any
      });
      
      let inserted = 0;
      if (result.length > 0) {
        const countryId = await getCountryId(portal.code);
        if (countryId) {
          inserted = await saveTenderResults(result, countryId);
        }
      }
      
      console.log(`✅ Found ${result.length} tenders via ${strategyUsed}. Saved ${inserted} to DB.`);
      stats.tenders.found += inserted;
    } catch (err) {
      console.error(`❌ Failed to scrape ${portal.portalType}:`, err);
    }
  }

  // 2. JOBS
  console.log("\n--- 2. Testing Jobs (Broad Search + Stealth HTML Proxy) ---");
  for (const country of countries) {
    try {
      console.log(`\n[Jobs] Searching for ${country.name}...`);
      const query = `jobs hiring in ${country.name} 2026`;
      const jobs = await discoverJobs(query, 2); // Limit to 2 pages to save time but still fetch a lot
      const inserted = await saveJobs(jobs, country.code);
      console.log(`✅ Found ${jobs.length} jobs via broad search for ${country.name}. Saved ${inserted} to DB.`);
      stats.jobs.found += inserted;
    } catch (err) {
      console.error(`❌ Failed to scrape jobs for ${country.name}:`, err);
    }
  }

  // 3. COMPLIANCE
  console.log("\n--- 3. Testing Compliance (Broad Search + Stealth HTML Proxy) ---");
  for (const country of countries) {
    try {
      console.log(`\n[Compliance] Searching for ${country.name}...`);
      const query = `tax compliance business registration guidelines forms ${country.name} 2026`;
      const docs = await discoverCompliance(query, 2);
      const inserted = await saveCompliance(docs, country.code);
      console.log(`✅ Found ${docs.length} compliance resources via broad search for ${country.name}. Saved ${inserted} to DB.`);
      stats.compliance.found += inserted;
    } catch (err) {
      console.error(`❌ Failed to scrape compliance for ${country.name}:`, err);
    }
  }

  console.log("\n==========================================");
  console.log("📊 FINAL ITERATION SUMMARY 📊");
  console.log("==========================================");
  console.log(`Tenders: Discovered & Saved ${stats.tenders.found}`);
  console.log(`Jobs:    Discovered & Saved ${stats.jobs.found}`);
  console.log(`Comp:    Discovered & Saved ${stats.compliance.found}`);
  console.log("==========================================");

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
