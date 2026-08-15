import { inngest } from "./client";
import { discoverHealth, BroadHealthResource } from "@/lib/scrapers/broad-search-engine-health";
import { db } from "@/lib/db/client";
import { healthIndicators, healthDataPoints } from "@/lib/db/schema/health";
import { countries } from "@/lib/db/schema/shared";
import { eq } from "drizzle-orm";

const HEALTH_TARGET = 5; // Second pass if below this threshold

async function getCountryId(countryHint: string): Promise<string | null> {
  const result = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, countryHint)).limit(1);
  return result.length > 0 ? result[0].id : null;
}

export async function saveHealthData(discovered: BroadHealthResource[], countryCode: string): Promise<number> {
  const countryId = await getCountryId(countryCode);
  if (!countryId) return 0;

  let inserted = 0;
  for (const item of discovered) {
    try {
      // 1. Ensure indicator exists
      const indicatorCode = item.indicatorCode || item.indicatorName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      await db.insert(healthIndicators).values({
        code: indicatorCode,
        name: item.indicatorName,
        unit: item.unit || '%',
        category: item.category || 'general',
      }).onConflictDoNothing();

      const [indicator] = await db.select({ id: healthIndicators.id }).from(healthIndicators).where(eq(healthIndicators.code, indicatorCode)).limit(1);
      if (!indicator) continue;

      // 2. Insert data point
      const rows = await db.insert(healthDataPoints).values({
        indicatorId: indicator.id,
        countryId,
        value: item.value.toString(),
        year: item.year || 2024,
        source: item.sourceUrl || 'Web Scraping',
      }).onConflictDoNothing().returning({ id: healthDataPoints.id });

      if (rows.length > 0) inserted++;
    } catch (e) {
      console.error(`Failed to insert health data: ${item.indicatorName}`, e);
    }
  }
  return inserted;
}

export { saveHealthData as saveHealthDb };

// ── Run all queries for a country ─────────────────────────────────────────────
async function runHealthQueries(queries: string[], countryCode: string, label: string): Promise<number> {
  let total = 0;
  for (let i = 0; i < queries.length; i++) {
    try {
      const discovered = await discoverHealth(queries[i], 5);
      const inserted = await saveHealthData(discovered, countryCode);
      total += inserted;
      console.log(`[${label}] q${i}: "${queries[i]}" → +${inserted} (running: ${total})`);
    } catch (e) {
      console.error(`[${label}] q${i} failed: ${(e as Error).message}`);
    }
  }
  return total;
}

function makeHealthScraper(
  id: string,
  name: string,
  cron: string,
  queries: string[],
  countryCode: string
) {
  return inngest.createFunction(
    { id, name, triggers: [{ cron }, { event: "manual.scrape.health" }] },
    async ({ step }) => {
      const pass1 = await step.run(`execute-health-scraper-pass1`, async () => {
        return await runHealthQueries(queries, countryCode, `${id}-p1`);
      });

      let totalInserted = pass1;

      if (pass1 < HEALTH_TARGET) {
        console.log(`[${id}] Pass 1 yielded ${pass1} — under target ${HEALTH_TARGET}. Running second pass...`);
        const pass2 = await step.run(`execute-health-scraper-pass2`, async () => {
          return await runHealthQueries(queries, countryCode, `${id}-p2`);
        });
        totalInserted += pass2;
      }

      return { message: `Scraped and inserted ${totalInserted} health data points for ${name}.`, totalInserted };
    }
  );
}

// ── Kenya (KE) ────────────────────────────────────────────────────────
export const scrapeHealthKenyaJob = makeHealthScraper(
  "scrape-health-kenya", "🇰🇪 Health Kenya", "0 6 * * *",
  [
    "Kenya health indicators statistics WHO 2026",
    "maternal mortality rate Kenya MOH 2026",
    "child mortality under 5 Kenya statistics 2026",
    "malaria HIV incidence rates Kenya DHIS2",
    "Ministry of Health Kenya annual performance report 2026",
  ],
  "KE"
);

// ── Tanzania (TZ) ───────────────────────────────────────────────────────
export const scrapeHealthTanzaniaJob = makeHealthScraper(
  "scrape-health-tanzania", "🇹🇿 Health Tanzania", "30 6 * * *",
  [
    "Tanzania health indicators statistics WHO 2026",
    "maternal mortality rate Tanzania MOH 2026",
    "child mortality under 5 Tanzania statistics 2026",
    "malaria HIV incidence rates Tanzania",
    "Ministry of Health Tanzania health bulletin 2026",
  ],
  "TZ"
);

// ── Uganda (UG) ─────────────────────────────────────────────────────────
export const scrapeHealthUgandaJob = makeHealthScraper(
  "scrape-health-uganda", "🇺🇬 Health Uganda", "0 7 * * *",
  [
    "Uganda health indicators statistics WHO 2026",
    "maternal mortality rate Uganda MOH 2026",
    "child mortality under 5 Uganda statistics 2026",
    "malaria HIV incidence rates Uganda",
    "Ministry of Health Uganda annual health sector performance report 2026",
  ],
  "UG"
);

// ── Rwanda (RW) ─────────────────────────────────────────────────────────
export const scrapeHealthRwandaJob = makeHealthScraper(
  "scrape-health-rwanda", "🇷🇼 Health Rwanda", "30 7 * * *",
  [
    "Rwanda health indicators statistics WHO 2026",
    "maternal mortality rate Rwanda MOH 2026",
    "child mortality under 5 Rwanda statistics 2026",
    "malaria HIV incidence rates Rwanda",
    "Ministry of Health Rwanda statistical yearbook 2026",
  ],
  "RW"
);

// ── Ethiopia (ET) ───────────────────────────────────────────────────────
export const scrapeHealthEthiopiaJob = makeHealthScraper(
  "scrape-health-ethiopia", "🇪🇹 Health Ethiopia", "0 8 * * *",
  [
    "Ethiopia health indicators statistics WHO 2026",
    "maternal mortality rate Ethiopia MOH 2026",
    "child mortality under 5 Ethiopia statistics 2026",
    "malaria HIV incidence rates Ethiopia",
    "Ministry of Health Ethiopia health and health related indicators 2026",
  ],
  "ET"
);

// ── DRC (CD) ────────────────────────────────────────────────────────────
export const scrapeHealthDRCJob = makeHealthScraper(
  "scrape-health-drc", "🇨🇩 Health DRC", "30 8 * * *",
  [
    "statistiques indicateurs de santé RDC OMS 2026",
    "taux de mortalité maternelle RDC Ministère de la Santé 2026",
    "mortalité infantile moins de 5 ans RDC 2026",
    "incidence paludisme VIH RDC",
    "annuaire statistique de la santé RDC 2026",
  ],
  "CD"
);

// ── Burundi (BI) ────────────────────────────────────────────────────────────
export const scrapeHealthBurundiJob = makeHealthScraper(
  "scrape-health-burundi", "🇧🇮 Health Burundi", "0 9 * * *",
  [
    "statistiques indicateurs de santé Burundi OMS 2026",
    "taux de mortalité maternelle Burundi Ministère de la Santé 2026",
    "mortalité infantile moins de 5 ans Burundi 2026",
    "incidence paludisme VIH Burundi",
    "rapport annuel ministère de la santé publique Burundi 2026",
  ],
  "BI"
);

// ── Somalia (SO) ────────────────────────────────────────────────────────────
export const scrapeHealthSomaliaJob = makeHealthScraper(
  "scrape-health-somalia", "🇸🇴 Health Somalia", "30 9 * * *",
  [
    "Somalia health indicators statistics WHO 2026",
    "maternal mortality rate Somalia MOH 2026",
    "child mortality under 5 Somalia statistics 2026",
    "malaria HIV incidence rates Somalia",
    "Ministry of Health Somalia annual health report 2026",
  ],
  "SO"
);

// ── South Sudan (SS) ────────────────────────────────────────────────────────────
export const scrapeHealthSouthSudanJob = makeHealthScraper(
  "scrape-health-south-sudan", "🇸🇸 Health South Sudan", "0 10 * * *",
  [
    "South Sudan health indicators statistics WHO 2026",
    "maternal mortality rate South Sudan MOH 2026",
    "child mortality under 5 South Sudan statistics 2026",
    "malaria HIV incidence rates South Sudan",
    "Ministry of Health South Sudan health management information system 2026",
  ],
  "SS"
);
