import { inngest } from "./client";
import { discoverHealth, BroadHealthResource } from "@/lib/scrapers/broad-search-engine-health";
import { db } from "@/lib/db/client";
import { healthIndicators, healthDataPoints } from "@/lib/db/schema/health";
import { countries } from "@/lib/db/schema/shared";
import { eq } from "drizzle-orm";

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

function makeHealthScraper(
  id: string,
  name: string,
  cron: string,
  queries: string[],
  countryCode: string
) {
  return inngest.createFunction(
    { id, name, triggers: [{ cron }] },
    async ({ step }) => {
      let totalInserted = 0;
      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        const insertedCount = await step.run(`execute-health-scraper-q${i}`, async () => {
          // Increase maxPages from 3 to 5
          const discovered = await discoverHealth(query, 5);
          return await saveHealthData(discovered, countryCode);
        });
        totalInserted += insertedCount;
      }

      return { message: `Scraped and inserted ${totalInserted} health data points for ${name}.` };
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
