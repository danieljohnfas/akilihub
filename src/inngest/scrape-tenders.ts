import { inngest } from "./client";
import { discoverTenders, BroadTenderResource } from "@/lib/scrapers/broad-search-engine-tenders";
import { db } from "@/lib/db/client";
import { tenders } from "@/lib/db/schema/tenders";
import { countries } from "@/lib/db/schema/shared";
import { eq } from "drizzle-orm";
import {
  ScraplingStrategy,
  FirecrawlStrategy,
  Crawl4AiStrategy,
  type TenderResult,
  type PortalType,
} from "@/lib/strategies/scraper-strategies";
import { StrategyEngine } from "@/lib/strategies/engine";

// ── Portal definitions ────────────────────────────────────────────────────────
// Each portal has a direct URL to scrape + a broad-search query as final fallback.
const PORTALS: Array<{
  id: string;
  name: string;
  cron: string;
  countryCode: string;
  portalType: PortalType;
  url: string;
  broadSearchQuery: string;
}> = [
  {
    id: "scrape-tenders-tanzania",
    name: "🇹🇿 Tenders Tanzania",
    cron: "0 0 * * *",
    countryCode: "TZ",
    portalType: "ppra_tz",
    url: "https://www.ppra.go.tz/tenders",
    broadSearchQuery: "government tenders Tanzania 2026",
  },
  {
    id: "scrape-tenders-kenya",
    name: "🇰🇪 Tenders Kenya",
    cron: "30 0 * * *",
    countryCode: "KE",
    portalType: "ppoa_ke",
    url: "https://tenders.go.ke/tenders/open",
    broadSearchQuery: "government tenders Kenya 2026",
  },
  {
    id: "scrape-tenders-uganda",
    name: "🇺🇬 Tenders Uganda",
    cron: "0 1 * * *",
    countryCode: "UG",
    portalType: "ppda_ug",
    url: "https://gpp.ppda.go.ug/public/bid-invitations",
    broadSearchQuery: "government tenders Uganda 2026",
  },
  {
    id: "scrape-tenders-rwanda",
    name: "🇷🇼 Tenders Rwanda",
    cron: "30 1 * * *",
    countryCode: "RW",
    portalType: "rppa_rw",
    url: "https://www.rppa.gov.rw/index.php?id=33",
    broadSearchQuery: "government tenders Rwanda 2026",
  },
  {
    id: "scrape-tenders-ethiopia",
    name: "🇪🇹 Tenders Ethiopia",
    cron: "0 2 * * *",
    countryCode: "ET",
    portalType: "pppa_et",
    url: "https://www.pppa.gov.et/index.php/procurement-opportunities",
    broadSearchQuery: "government tenders Ethiopia 2026",
  },
  {
    id: "scrape-tenders-congo-drc",
    name: "🇨🇩 Tenders Congo DRC",
    cron: "30 2 * * *",
    countryCode: "CD",
    portalType: "armp_cd",
    url: "https://www.armp.cd/index.php/appels-doffres",
    broadSearchQuery: "government tenders Congo DRC 2026",
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
      await db
        .insert(tenders)
        .values({
          referenceNo: t.referenceNo,
          title: t.title,
          description: t.description ?? null,
          contractingAuthority: t.contractingAuthority,
          deadline: t.deadline ? new Date(t.deadline) : new Date(Date.now() + 14 * 86400000),
          sourceUrl: t.sourceUrl,
          countryId,
          status: "open",
        })
        .onConflictDoNothing();
      inserted++;
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
      await db
        .insert(tenders)
        .values({
          referenceNo: t.referenceNo,
          title: t.title,
          description: t.description ?? null,
          contractingAuthority: t.contractingAuthority,
          category: t.category,
          budget: t.budget?.toString() ?? null,
          currency: t.currency,
          deadline: t.deadline ?? new Date(Date.now() + 14 * 86400000),
          sourceUrl: t.sourceUrl,
          countryId,
          status: "open",
        })
        .onConflictDoNothing();
      inserted++;
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

// ── Job factory ───────────────────────────────────────────────────────────────
function makePortalJob(portal: (typeof PORTALS)[number]) {
  return inngest.createFunction(
    { id: portal.id, name: portal.name, triggers: [{ cron: portal.cron }] },
    async ({ step }) => {
      const insertedCount = await step.run("execute-scraper", async () => {
        const countryId = await getCountryId(portal.countryCode);
        if (!countryId) {
          console.warn(`[${portal.id}] Country ${portal.countryCode} not found. Skipping.`);
          return 0;
        }

        // 1. Try the strategy cascade (Scrapling → Firecrawl → Crawlee)
        const engine = buildStrategyEngine();
        try {
          const { result, strategyUsed } = await engine.executeWithFallback({
            url: portal.url,
            portalType: portal.portalType,
          });

          if (result.length > 0) {
            console.log(`[${portal.id}] ${strategyUsed} returned ${result.length} tenders.`);
            return await saveTenderResults(result, countryId);
          }

          console.log(`[${portal.id}] Strategy cascade returned 0 results — falling back to broad search.`);
        } catch (err) {
          console.warn(`[${portal.id}] All strategies failed: ${(err as Error).message}. Falling back to broad search.`);
        }

        // 2. Final fallback: broad Google search + Gemini extraction (no portal URL needed)
        const discovered = await discoverTenders(portal.broadSearchQuery, 5);
        return await saveBroadResults(discovered, countryId);
      });

      if (insertedCount > 0) {
        await step.sendEvent("notify-new-tenders", {
          name: "tenders.new",
          data: { count: insertedCount, source: portal.name },
        });
      }

      return {
        message: `Scraped and inserted ${insertedCount} tenders for ${portal.name}.`,
      };
    }
  );
}

// ── Exports ───────────────────────────────────────────────────────────────────
export const scrapePPRATanzaniaJob = makePortalJob(PORTALS[0]);
export const scrapePPRAKenyaJob    = makePortalJob(PORTALS[1]);
export const scrapePPDAUgandaJob   = makePortalJob(PORTALS[2]);
export const scrapeRPPARwandaJob   = makePortalJob(PORTALS[3]);
export const scrapePPPAEthiopiaJob = makePortalJob(PORTALS[4]);
export const scrapeARMPCongoDRCJob = makePortalJob(PORTALS[5]);