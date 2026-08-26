import { inngest } from "./client";
import { discoverTenders, BroadTenderResource } from "@/lib/scrapers/broad-search-engine-tenders";
import { db } from "@/lib/db/client";
import { tenders } from "@/lib/db/schema/tenders";
import { countries } from "@/lib/db/schema/shared";
import { eq } from "drizzle-orm";
import { normalizeLocationAndGetRegionId } from "@/lib/ai/location";
import { classifySourceUrl } from "@/lib/sources/employer-resolver";
import {
  ScraplingStrategy,
  FirecrawlStrategy,
  Crawl4AiStrategy,
  type TenderResult,
  type PortalType,
} from "@/lib/strategies/scraper-strategies";
import { StrategyEngine } from "@/lib/strategies/engine";

// ── Portal definitions ────────────────────────────────────────────────────────
// Each portal has a direct URL to scrape + broad-search queries as final fallback.
const PORTALS: Array<{
  id: string;
  name: string;
  cron: string;
  countryCode: string;
  portalType: PortalType;
  url: string;
  broadSearchQueries: string[];
}> = [
  {
    id: "scrape-tenders-kenya",
    name: "🇰🇪 Tenders Kenya",
    cron: "30 0 * * *",
    countryCode: "KE",
    portalType: "ppoa_ke",
    url: "https://tenders.go.ke/tenders/open",
    broadSearchQueries: [
      "government tenders Kenya 2026",
      "NGO tenders Kenya 2026",
      "site:reliefweb.int tenders Kenya 2026",
      "UNOPS procurement Kenya",
      "World Bank tenders Kenya",
      "site:ungm.org Kenya"
    ],
  },
  {
    id: "scrape-tenders-tanzania",
    name: "🇹🇿 Tenders Tanzania",
    cron: "0 0 * * *",
    countryCode: "TZ",
    portalType: "ppra_tz",
    url: "https://www.ppra.go.tz/tenders",
    broadSearchQueries: [
      "government tenders Tanzania 2026",
      "NGO tenders Tanzania 2026",
      "site:reliefweb.int tenders Tanzania 2026",
      "UNOPS procurement Tanzania",
      "site:ungm.org Tanzania"
    ],
  },
  {
    id: "scrape-tenders-uganda",
    name: "🇺🇬 Tenders Uganda",
    cron: "0 1 * * *",
    countryCode: "UG",
    portalType: "ppda_ug",
    url: "https://gpp.ppda.go.ug/public/bid-invitations",
    broadSearchQueries: [
      "government tenders Uganda 2026",
      "NGO tenders Uganda 2026",
      "site:reliefweb.int tenders Uganda 2026",
      "UNOPS procurement Uganda",
      "site:ungm.org Uganda"
    ],
  },
  {
    id: "scrape-tenders-rwanda",
    name: "🇷🇼 Tenders Rwanda",
    cron: "30 1 * * *",
    countryCode: "RW",
    portalType: "rppa_rw",
    url: "https://www.rppa.gov.rw/index.php?id=33",
    broadSearchQueries: [
      "government tenders Rwanda 2026",
      "NGO tenders Rwanda 2026",
      "site:reliefweb.int tenders Rwanda 2026",
      "UNOPS procurement Rwanda",
      "appels d'offres Rwanda 2026"
    ],
  },
  {
    id: "scrape-tenders-ethiopia",
    name: "🇪🇹 Tenders Ethiopia",
    cron: "0 2 * * *",
    countryCode: "ET",
    portalType: "pppa_et",
    url: "https://www.pppa.gov.et/index.php/procurement-opportunities",
    broadSearchQueries: [
      "government tenders Ethiopia 2026",
      "NGO tenders Ethiopia 2026",
      "site:reliefweb.int tenders Ethiopia 2026",
      "UNOPS procurement Ethiopia",
      "site:ungm.org Ethiopia"
    ],
  },
  {
    id: "scrape-tenders-congo-drc",
    name: "🇨🇩 Tenders Congo DRC",
    cron: "30 2 * * *",
    countryCode: "CD",
    portalType: "armp_cd",
    url: "https://www.armp.cd/index.php/appels-doffres",
    broadSearchQueries: [
      "government tenders Congo DRC 2026",
      "appels d'offres gouvernement RDC 2026",
      "appels d'offres ONG RDC Congo 2026",
      "site:reliefweb.int tenders DRC",
      "UNOPS procurement DRC"
    ],
  },
  {
    id: "scrape-tenders-burundi",
    name: "🇧🇮 Tenders Burundi",
    cron: "0 3 * * *",
    countryCode: "BI",
    portalType: "armp_bi",
    url: "https://www.armp.bi/appels-offres",
    broadSearchQueries: [
      "government tenders Burundi 2026",
      "appels d'offres gouvernement Burundi 2026",
      "appels d'offres ONG Burundi 2026",
      "site:reliefweb.int tenders Burundi",
      "UNOPS procurement Burundi"
    ],
  },
  {
    id: "scrape-tenders-somalia",
    name: "🇸🇴 Tenders Somalia",
    cron: "30 3 * * *",
    countryCode: "SO",
    portalType: "mof_so",
    url: "https://mof.gov.so/tenders",
    broadSearchQueries: [
      "government tenders Somalia 2026",
      "NGO tenders Somalia 2026",
      "site:reliefweb.int tenders Somalia 2026",
      "UNOPS procurement Somalia",
      "site:ungm.org Somalia"
    ],
  },
  {
    id: "scrape-tenders-south-sudan",
    name: "🇸🇸 Tenders South Sudan",
    cron: "0 4 * * *",
    countryCode: "SS",
    portalType: "gpoc_ss",
    url: "https://www.mofep-grss.org/procurement/",
    broadSearchQueries: [
      "government tenders South Sudan 2026",
      "NGO tenders South Sudan 2026",
      "site:reliefweb.int tenders South Sudan 2026",
      "UNOPS procurement South Sudan",
      "site:ungm.org South Sudan"
    ],
  },
];

// ── DB helpers ────────────────────────────────────────────────────────────────
export async function getCountryId(countryCode: string): Promise<string | null> {
  const result = await db
    .select({ id: countries.id })
    .from(countries)
    .where(eq(countries.code, countryCode))
    .limit(1);
  return result.length > 0 ? result[0].id : null;
}

export async function saveTenderResults(
  items: TenderResult[],
  countryId: string
): Promise<number> {
  let inserted = 0;
  for (const t of items) {
    try {
      const regionId = await normalizeLocationAndGetRegionId(t.contractingAuthority);
      const { isAggregatorSource, quickEmployerUrl } = classifySourceUrl(t.sourceUrl);
      const rows = await db
        .insert(tenders)
        .values({
          referenceNo: t.referenceNo,
          title: t.title,
          description: t.description ?? null,
          contractingAuthority: t.contractingAuthority,
          deadline: t.deadline ? new Date(t.deadline) : null,
          sourceUrl: t.sourceUrl,
          employerUrl: quickEmployerUrl,
          isAggregatorSource,
          countryId,
          regionId,
          status: "open",
        })
        .onConflictDoNothing()
        .returning({ id: tenders.id });
      if (rows.length > 0) inserted++;
    } catch (e) {
      console.error(`[scrape-tenders] Failed to insert: ${t.referenceNo}`, e);
    }
  }
  return inserted;
}

export async function saveBroadResults(
  items: BroadTenderResource[],
  countryId: string
): Promise<number> {
  let inserted = 0;
  for (const t of items) {
    try {
      const { isAggregatorSource, quickEmployerUrl } = classifySourceUrl(t.sourceUrl);
      const safeBudget = (t.budget && t.budget <= 10000000000) ? t.budget.toString() : null;
      const rows = await db
        .insert(tenders)
        .values({
          referenceNo: t.referenceNo,
          title: t.title,
          description: t.description ?? null,
          contractingAuthority: t.contractingAuthority,
          category: t.category,
          budget: safeBudget,
          currency: t.currency,
          deadline: t.deadline ?? null,
          sourceUrl: t.sourceUrl,
          employerUrl: quickEmployerUrl,
          isAggregatorSource,
          countryId,
          regionId: t.regionId ?? null,
          status: "open",
        })
        .onConflictDoNothing()
        .returning({ id: tenders.id });
      if (rows.length > 0) inserted++;
    } catch (e) {
      console.error(`[scrape-tenders] Broad insert failed: ${t.referenceNo}`, e);
    }
  }
  return inserted;
}

// ── Strategy cascade ──────────────────────────────────────────────────────────
// Order: Scrapling (stealth) → Firecrawl (cloud) → Crawl4AI (local)
// If all strategies fail, falls back to broad Google Search + AI extraction.
function buildStrategyEngine() {
  return new StrategyEngine([
    new ScraplingStrategy(),
    new FirecrawlStrategy(),
    new Crawl4AiStrategy(),
  ]);
}

// ── Thresholds ────────────────────────────────────────────────────────────────
const TENDER_TARGET = 200; // Minimum new inserts before we skip second pass

// ── Run known sources for a country, returns total inserted ─────────────────
async function runKnownTenderSourcesForCountry(countryCode: string, label: string): Promise<number> {
  let total = 0;
  try {
    const { getKnownEmployerUrlsForCountry, scrapeKnownUrls } = await import('@/lib/scrapers/known-sources-scraper');
    const { extractTendersWithAI } = await import('@/lib/scrapers/broad-search-engine-tenders');
    const countryId = await getCountryId(countryCode);
    if (!countryId) return 0;

    const urls = await getKnownEmployerUrlsForCountry(countryId, 'tenders', 20);
    console.log(`[${label}] Found ${urls.length} known authority URLs to scrape directly.`);

    const pages = await scrapeKnownUrls(urls);
    for (const page of pages) {
      const extracted = await extractTendersWithAI(page.text, page.url, page.pdfLinks);
      if (extracted.length > 0) {
        const inserted = await saveBroadResults(extracted, countryId);
        total += inserted;
        console.log(`[${label}] Scraped known source ${page.url} → +${inserted} (running: ${total})`);
      }
    }
  } catch (e) {
    console.error(`[${label}] Known sources failed: ${(e as Error).message}`);
  }
  return total;
}

// ── Run broad queries for a country, returns total inserted ──────────────────
async function runBroadQueriesForCountry(queries: string[], countryCode: string, label: string): Promise<number> {
  let total = 0;
  const countryId = await getCountryId(countryCode);
  if (!countryId) return 0;
  for (const query of queries) {
    try {
      const discovered = await discoverTenders(query, 5);
      const saved = await saveBroadResults(discovered, countryId);
      total += saved;
      console.log(`[${label}] Broad "${query}" → +${saved} (running: ${total})`);
    } catch (err) {
      console.warn(`[${label}] Broad query failed: "${query}" — ${(err as Error).message}`);
    }
  }
  return total;
}

// ── Job factory ───────────────────────────────────────────────────────────────
function makePortalJob(portal: (typeof PORTALS)[number]) {
  return inngest.createFunction(
    { id: portal.id, name: portal.name, triggers: [{ cron: portal.cron }, { event: "manual.scrape.tenders" }] },
    async ({ step }) => {
      const countryId = await getCountryId(portal.countryCode);
      if (!countryId) {
        console.warn(`[${portal.id}] Country ${portal.countryCode} not found. Skipping.`);
        return { message: `Country ${portal.countryCode} not found.` };
      }

      // Pass 0 — known authority URLs (cleanest, highest priority)
      const pass0 = await step.run("execute-known-sources", async () => {
        return await runKnownTenderSourcesForCountry(portal.countryCode, `${portal.id}-known`);
      });

      let totalInserted = pass0;

      // Pass 1 — portal-direct scraping + broad queries
      const pass1 = await step.run("execute-portal-and-broad", async () => {
        let inserted = 0;

        // Portal-direct scraping (Scrapling → Firecrawl → Crawl4AI)
        const engine = buildStrategyEngine();
        try {
          const { result, strategyUsed } = await engine.executeWithFallback({
            url: portal.url,
            portalType: portal.portalType,
          });
          console.log(`[${portal.id}] ${strategyUsed} returned ${result.length} portal tenders.`);
          if (result.length > 0) {
            const saved = await saveTenderResults(result, countryId);
            inserted += saved;
            console.log(`[${portal.id}] Portal save: +${saved}`);
          }
        } catch (err) {
          console.warn(`[${portal.id}] Portal strategies failed: ${(err as Error).message} — continuing to broad search.`);
        }

        // Broad web search (catches NGO, UNOPS, World Bank, ReliefWeb, etc.)
        inserted += await runBroadQueriesForCountry(portal.broadSearchQueries, portal.countryCode, `${portal.id}-p1`);
        return inserted;
      });

      totalInserted += pass1;

      // Pass 2 — retry broad queries if we fell short of the target
      if (totalInserted < TENDER_TARGET) {
        console.log(`[${portal.id}] Pass 1 yielded ${totalInserted} — under target ${TENDER_TARGET}. Running second pass...`);
        const pass2 = await step.run("execute-broad-pass2", async () => {
          return await runBroadQueriesForCountry(portal.broadSearchQueries, portal.countryCode, `${portal.id}-p2`);
        });
        totalInserted += pass2;
        console.log(`[${portal.id}] Pass 2 added ${pass2}. Grand total: ${totalInserted}`);
      }

      if (totalInserted > 0) {
        await step.sendEvent("notify-new-tenders", {
          name: "tenders.new",
          data: { count: totalInserted, source: portal.name },
        });
      }

      return {
        message: `Scraped and inserted ${totalInserted} tenders for ${portal.name}.`,
        totalInserted,
        hitTarget: totalInserted >= TENDER_TARGET,
      };
    }
  );
}

// ── Exports ───────────────────────────────────────────────────────────────────
export const scrapePPRAKenyaJob    = makePortalJob(PORTALS[0]);
export const scrapePPRATanzaniaJob = makePortalJob(PORTALS[1]);
export const scrapePPDAUgandaJob   = makePortalJob(PORTALS[2]);
export const scrapeRPPARwandaJob   = makePortalJob(PORTALS[3]);
export const scrapePPPAEthiopiaJob = makePortalJob(PORTALS[4]);
export const scrapeARMPCongoDRCJob = makePortalJob(PORTALS[5]);
export const scrapeARMPBurundiJob  = makePortalJob(PORTALS[6]);
export const scrapeMOFSomaliaJob   = makePortalJob(PORTALS[7]);
export const scrapeGPOCSouthSudanJob = makePortalJob(PORTALS[8]);