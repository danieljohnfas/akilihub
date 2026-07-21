import { db } from '../src/lib/db/client';
import { tenders } from '../src/lib/db/schema/tenders';
import { jobs } from '../src/lib/db/schema/jobs';
import { countries } from '../src/lib/db/schema/shared';
import { eq } from 'drizzle-orm';
import { FirecrawlStrategy, ScraplingStrategy, Crawl4AiStrategy, type TenderResult, type PortalType } from '../src/lib/strategies/scraper-strategies';
import { StrategyEngine } from '../src/lib/strategies/engine';
import { discoverTenders } from '../src/lib/scrapers/broad-search-engine-tenders';
import { discoverJobs } from '../src/lib/scrapers/broad-search-engine';
import { discoverSalaries } from '../src/lib/scrapers/broad-search-engine-salaries';
import { discoverCompliance } from '../src/lib/scrapers/broad-search-engine-compliance';
import { discoverHealth } from '../src/lib/scrapers/broad-search-engine-health';
import { saveTenderResults, saveBroadResults } from '../src/inngest/scrape-tenders';
import { saveJobs as saveJobsDb } from '../src/inngest/scrape-jobs';
import { saveSalariesDb } from '../src/inngest/scrape-salaries';
import { saveComplianceDb } from '../src/inngest/scrape-compliance';
import { saveHealthDb } from '../src/inngest/scrape-health';

const PORTALS: Array<{ id: string; name: string; countryCode: string; portalType: PortalType; url: string; broadSearchQuery: string }> = [
  { id: "scrape-tenders-tanzania", name: "🇹🇿 Tenders Tanzania", countryCode: "TZ", portalType: "ppra_tz", url: "https://www.ppra.go.tz/tenders", broadSearchQuery: "government tenders Tanzania 2026" },
  { id: "scrape-tenders-kenya", name: "🇰🇪 Tenders Kenya", countryCode: "KE", portalType: "ppoa_ke", url: "https://tenders.go.ke/tenders/open", broadSearchQuery: "government tenders Kenya 2026" },
  { id: "scrape-tenders-uganda", name: "🇺🇬 Tenders Uganda", countryCode: "UG", portalType: "ppda_ug", url: "https://gpp.ppda.go.ug/public/bid-invitations", broadSearchQuery: "government tenders Uganda 2026" },
  { id: 'rwanda-rppa', name: '🇷🇼 Tenders Rwanda', countryCode: 'RW', portalType: 'rppa_rw', url: 'https://www.umucyo.gov.rw/', broadSearchQuery: 'tenders UMUCYO Rwanda 2026' },
  { id: 'ethiopia-pppa', name: '🇪🇹 Tenders Ethiopia', countryCode: 'ET', portalType: 'pppa_et', url: 'https://egp.ppa.gov.et/egp/bids/published', broadSearchQuery: 'Ethiopia public procurement tenders 2026' },
  { id: 'drc-armp', name: '🇨🇩 Tenders DRC', countryCode: 'CD', portalType: 'armp_cd', url: 'https://www.armp-rdc.org/marches-publics/', broadSearchQuery: 'appels d\'offres ARMP RDC 2026' }
];

const JOB_QUERIES = [
  { country: 'Kenya', code: 'KE', query: 'jobs vacancies Kenya Nairobi 2026' },
  { country: 'Tanzania', code: 'TZ', query: 'jobs vacancies Tanzania Dar es Salaam 2026' },
  { country: 'Uganda', code: 'UG', query: 'jobs vacancies Uganda Kampala 2026' },
  { country: 'Rwanda', code: 'RW', query: 'jobs vacancies Rwanda Kigali 2026' },
  { country: 'Ethiopia', code: 'ET', query: 'jobs vacancies Ethiopia Addis Ababa 2026' },
  { country: 'DRC', code: 'CD', query: 'offres d\'emploi RDC Kinshasa 2026' },
];

const SALARY_QUERIES = [
  { country: 'Kenya', code: 'KE', query: 'average salary compensation benchmarks Kenya 2026' },
  { country: 'Tanzania', code: 'TZ', query: 'average salary compensation benchmarks Tanzania 2026' },
  { country: 'Uganda', code: 'UG', query: 'average salary compensation benchmarks Uganda 2026' },
  { country: 'Rwanda', code: 'RW', query: 'average salary compensation benchmarks Rwanda 2026' },
  { country: 'Ethiopia', code: 'ET', query: 'average salary compensation benchmarks Ethiopia 2026' },
  { country: 'DRC', code: 'CD', query: 'salaire moyen rémunération RDC Congo 2026' },
];

const COMPLIANCE_QUERIES = [
  { country: 'Kenya', code: 'KE', query: 'business registration tax compliance KRA BRS Kenya forms' },
  { country: 'Tanzania', code: 'TZ', query: 'business registration tax compliance TRA BRELA Tanzania forms' },
  { country: 'Uganda', code: 'UG', query: 'business registration tax compliance URA URSB Uganda forms' },
  { country: 'Rwanda', code: 'RW', query: 'business registration tax compliance RRA RDB Rwanda forms' },
  { country: 'Ethiopia', code: 'ET', query: 'business registration tax compliance Ethiopia forms' },
  { country: 'DRC', code: 'CD', query: 'enregistrement entreprise conformité fiscale DGI RDC formulaires' },
];

const HEALTH_QUERIES = [
  { country: 'Kenya', code: 'KE', query: 'public health statistics maternal mortality DHIS2 Kenya' },
  { country: 'Tanzania', code: 'TZ', query: 'public health statistics maternal mortality DHIS2 Tanzania' },
  { country: 'Uganda', code: 'UG', query: 'public health statistics maternal mortality DHIS2 Uganda' },
  { country: 'Rwanda', code: 'RW', query: 'public health statistics maternal mortality DHIS2 Rwanda' },
  { country: 'Ethiopia', code: 'ET', query: 'public health statistics maternal mortality DHIS2 Ethiopia' },
  { country: 'DRC', code: 'CD', query: 'statistiques santé publique mortalité maternelle RDC Congo' },
];

async function getCountryId(code: string) {
  const result = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, code)).limit(1);
  return result[0]?.id;
}

async function main() {
  console.log("=== COMPREHENSIVE SCRAPE (ONLINE ONLY) ===");
  console.log("Using ALL strategies: Scrapling, Firecrawl, Crawlee, Crawl4Ai, Maxun, and AI Broad Search.\n");

  // Force the strategies to use the live Render URL instead of localhost
  process.env.SIDECAR_URL = process.env.SCRAPLING_URL;
  console.log("Sidecar URL set to: " + process.env.SIDECAR_URL);

  const engine = new StrategyEngine([
    new ScraplingStrategy(),
    new FirecrawlStrategy(),
    new Crawl4AiStrategy()
  ]);

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
  for (const job of JOB_QUERIES) {
    console.log(`\nAI Broad Search for ${job.country} Jobs...`);
    try {
      const discovered = await discoverJobs(job.query, 2);
      console.log(`🤖 AI Router extracted ${discovered.length} jobs via Search.`);
      const inserted = await saveJobsDb(discovered, job.code);
      console.log(`-> Inserted ${inserted} new jobs.`);
    } catch (e: any) {
      console.log(`❌ AI Search failed for ${job.country}: ${e.message}`);
    }
  }

  console.log("\n--- SALARIES ---");
  for (const q of SALARY_QUERIES) {
    console.log(`\nAI Broad Search for ${q.country} Salaries...`);
    const results = await discoverSalaries(q.query, 1);
    const inserted = await saveSalariesDb(results, q.code);
    console.log(`-> Inserted ${inserted} new salaries.`);
  }

  console.log("\n--- COMPLIANCE ---");
  for (const q of COMPLIANCE_QUERIES) {
    console.log(`\nAI Broad Search for ${q.country} Compliance...`);
    const results = await discoverCompliance(q.query, 1);
    const inserted = await saveComplianceDb(results, q.code);
    console.log(`-> Inserted ${inserted} new compliance resources.`);
  }

  console.log("\n--- HEALTH ---");
  for (const q of HEALTH_QUERIES) {
    console.log(`\nAI Broad Search for ${q.country} Health...`);
    const results = await discoverHealth(q.query, 1);
    const inserted = await saveHealthDb(results, q.code);
    console.log(`-> Inserted ${inserted} new health data points.`);
  }

  console.log("\n=== SCRAPE COMPLETE ===\n");
  process.exit(0);
}

main().catch(console.error);
