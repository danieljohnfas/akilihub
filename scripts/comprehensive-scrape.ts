import { db } from '../src/lib/db/client';
import { tenders } from '../src/lib/db/schema/tenders';
import { jobs } from '../src/lib/db/schema/jobs';
import { countries } from '../src/lib/db/schema/shared';
import { eq } from 'drizzle-orm';
import { FirecrawlStrategy, CrawleeStrategy, type TenderResult, type PortalType } from '../src/lib/strategies/scraper-strategies';
import { StrategyEngine } from '../src/lib/strategies/engine';
import { discoverTenders } from '../src/lib/scrapers/broad-search-engine-tenders';
import { discoverJobs } from '../src/lib/scrapers/broad-search-engine';
import { saveTenderResults, saveBroadResults } from '../src/inngest/scrape-tenders';
import { saveJobs as saveJobsDb } from '../src/inngest/scrape-jobs';

const PORTALS: Array<{ id: string; name: string; countryCode: string; portalType: PortalType; url: string; broadSearchQuery: string }> = [
  { id: "scrape-tenders-tanzania", name: "🇹🇿 Tenders Tanzania", countryCode: "TZ", portalType: "ppra_tz", url: "https://www.ppra.go.tz/tenders", broadSearchQuery: "government tenders Tanzania 2026" },
  { id: "scrape-tenders-kenya", name: "🇰🇪 Tenders Kenya", countryCode: "KE", portalType: "ppoa_ke", url: "https://tenders.go.ke/tenders/open", broadSearchQuery: "government tenders Kenya 2026" },
  { id: "scrape-tenders-uganda", name: "🇺🇬 Tenders Uganda", countryCode: "UG", portalType: "ppda_ug", url: "https://gpp.ppda.go.ug/public/bid-invitations", broadSearchQuery: "government tenders Uganda 2026" },
  { id: "scrape-tenders-rwanda", name: "🇷🇼 Tenders Rwanda", countryCode: "RW", portalType: "rppa_rw", url: "https://www.rppa.gov.rw/index.php?id=33", broadSearchQuery: "government tenders Rwanda 2026" },
  { id: "scrape-tenders-ethiopia", name: "🇪🇹 Tenders Ethiopia", countryCode: "ET", portalType: "pppa_et", url: "https://www.pppa.gov.et/index.php/procurement-opportunities", broadSearchQuery: "government tenders Ethiopia 2026" },
];

const JOB_SEARCHES = [
  { name: "🇰🇪 Jobs Kenya", query: "jobs hiring in Nairobi Kenya 2026", countryCode: "KE" },
  { name: "🇹🇿 Jobs Tanzania", query: "jobs vacancies Tanzania Dar es Salaam 2026", countryCode: "TZ" },
  { name: "🇺🇬 Jobs Uganda", query: "jobs vacancies Uganda Kampala 2026", countryCode: "UG" },
  { name: "🇷🇼 Jobs Rwanda", query: "jobs vacancies Rwanda Kigali 2026", countryCode: "RW" },
];

async function getCountryId(code: string) {
  const result = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, code)).limit(1);
  return result[0]?.id;
}

async function main() {
  console.log("=== COMPREHENSIVE SCRAPE (ONLINE ONLY) ===");
  console.log("Using ONLY cloud strategies: Firecrawl, Crawlee, and AI Broad Search.\n");

  const engine = new StrategyEngine([new FirecrawlStrategy(), new CrawleeStrategy()]);

  console.log("--- TENDERS ---");
  for (const portal of PORTALS) {
    const countryId = await getCountryId(portal.countryCode);
    if (!countryId) continue;
    
    console.log(`\nScraping ${portal.name}...`);
    try {
      const { result, strategyUsed } = await engine.executeWithFallback({
        url: portal.url,
        portalType: portal.portalType,
      });

      if (result.length > 0) {
        console.log(`✅ Success via ${strategyUsed}! Extracted ${result.length} tenders.`);
        const inserted = await saveTenderResults(result, countryId);
        console.log(`-> Inserted ${inserted} new tenders.`);
      } else {
        console.log(`⚠️ ${strategyUsed} returned 0 results. Falling back to AI broad search...`);
        const discovered = await discoverTenders(portal.broadSearchQuery, 2);
        console.log(`🤖 AI Router found ${discovered.length} tenders.`);
        const inserted = await saveBroadResults(discovered, countryId);
        console.log(`-> Inserted ${inserted} AI-discovered tenders.`);
      }
    } catch (e: any) {
      console.log(`❌ All portal strategies failed: ${e.message}`);
      console.log(`🤖 Falling back to AI broad search for ${portal.name}...`);
      const discovered = await discoverTenders(portal.broadSearchQuery, 2);
      console.log(`🤖 AI Router found ${discovered.length} tenders.`);
      const inserted = await saveBroadResults(discovered, countryId);
      console.log(`-> Inserted ${inserted} AI-discovered tenders.`);
    }
  }

  console.log("\n--- JOBS ---");
  for (const job of JOB_SEARCHES) {
    console.log(`\nAI Broad Search for ${job.name}...`);
    try {
      const discovered = await discoverJobs(job.query, 2);
      console.log(`🤖 AI Router extracted ${discovered.length} jobs via Search.`);
      const inserted = await saveJobsDb(discovered, job.countryCode);
      console.log(`-> Inserted ${inserted} new jobs.`);
    } catch (e: any) {
      console.log(`❌ AI Search failed for ${job.name}: ${e.message}`);
    }
  }
  
  console.log("\n=== SCRAPE COMPLETE ===");
  process.exit(0);
}

main().catch(console.error);
