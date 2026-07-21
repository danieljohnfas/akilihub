import { inngest } from "./client";
import { db } from "@/lib/db/client";
import { healthIndicators, healthDataPoints } from "@/lib/db/schema/health";
import { countries } from "@/lib/db/schema/shared";
import { eq, and } from "drizzle-orm";

// ── Indicator definitions ─────────────────────────────────────────────────────
// These are well-known DHIS2 / WHO indicator codes tracked across East Africa.
const INDICATORS: Array<{
  code: string;
  name: string;
  unit: string;
  category: string;
  dhis2Id?: string;
}> = [
  { code: "MMR",      name: "Maternal Mortality Ratio",             unit: "per 100,000 live births", category: "maternal" },
  { code: "U5MR",     name: "Under-5 Mortality Rate",               unit: "per 1,000 live births",   category: "child" },
  { code: "IMR",      name: "Infant Mortality Rate",                 unit: "per 1,000 live births",   category: "child" },
  { code: "ANC4",     name: "Antenatal Care (4+ visits)",            unit: "%",                       category: "maternal" },
  { code: "BCG_COV",  name: "BCG Vaccination Coverage",              unit: "%",                       category: "immunization" },
  { code: "DTP3_COV", name: "DTP3 Vaccination Coverage",             unit: "%",                       category: "immunization" },
  { code: "MAL_INC",  name: "Malaria Incidence",                     unit: "per 1,000 population",   category: "infectious" },
  { code: "TB_NOT",   name: "TB Notification Rate",                  unit: "per 100,000 population", category: "infectious" },
  { code: "HIV_PREV", name: "HIV Prevalence (15-49 years)",          unit: "%",                       category: "infectious" },
  { code: "SBA",      name: "Skilled Birth Attendance",              unit: "%",                       category: "maternal" },
  { code: "FP_CPR",   name: "Contraceptive Prevalence Rate",         unit: "%",                       category: "reproductive" },
  { code: "ORS_DIAG", name: "ORS Use in Children with Diarrhea",    unit: "%",                       category: "child" },
];

// Country-specific DHIS2 configuration
const DHIS2_COUNTRIES: Array<{
  countryCode: string;
  name: string;
  baseUrl: string;
  user: string;
  pass: string;
}> = [
  {
    countryCode: "TZ",
    name: "Tanzania",
    baseUrl: process.env.DHIS2_TZ_BASE_URL ?? "",
    user: process.env.DHIS2_TZ_USER ?? "",
    pass: process.env.DHIS2_TZ_PASS ?? "",
  },
  // Kenya, Uganda, Rwanda, Ethiopia use WHO Global Health Observatory as fallback
  // when their national DHIS2 instances are not available
];

// ── WHO Global Health Observatory API ─────────────────────────────────────────
// Free, no API key required. Returns data for all countries.
const WHO_INDICATOR_MAP: Record<string, string> = {
  MMR:      "MDG_0000000026",  // Maternal mortality ratio
  U5MR:     "MDG_0000000007",  // Under-5 mortality rate
  IMR:      "MDG_0000000003",  // Infant mortality rate
  ANC4:     "RMNCH_ANC4",     // ANC 4+ visits
  BCG_COV:  "WHS4_543",       // BCG coverage
  DTP3_COV: "WHS4_544",       // DTP3 coverage
  MAL_INC:  "MALARIA_EST_INCIDENCE_RATE", // Malaria incidence
  TB_NOT:   "MDG_0000000020", // TB notification rate
  HIV_PREV: "HIV_0000000001", // HIV prevalence
  SBA:      "WHS4_154",       // Skilled birth attendance
  FP_CPR:   "FP_CSWM",       // Contraceptive prevalence
  ORS_DIAG: "NUTRITION_WH2", // ORS use
};

const WHO_COUNTRY_MAP: Record<string, string> = {
  KE: "KEN", TZ: "TZA", UG: "UGA", RW: "RWA", ET: "ETH", CD: "COD",
};

const EAC_COUNTRIES = Object.keys(WHO_COUNTRY_MAP);

async function fetchWHOIndicator(
  indicatorCode: string,
  whoCode: string,
  whoCountry: string,
): Promise<{ value: number; year: number } | null> {
  try {
    const url = `https://ghoapi.azureedge.net/api/${whoCode}?$filter=SpatialDim eq '${whoCountry}'&$orderby=TimeDim desc&$top=1`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;

    const data = await response.json();
    const record = data?.value?.[0];
    if (!record || record.NumericValue == null) return null;

    return {
      value: parseFloat(record.NumericValue),
      year: record.TimeDim,
    };
  } catch {
    return null;
  }
}

async function fetchDHIS2Indicator(
  indicatorCode: string,
  baseUrl: string,
  user: string,
  pass: string,
): Promise<{ value: number; year: number } | null> {
  if (!baseUrl || !user || !pass) return null;

  try {
    const year = new Date().getFullYear() - 1; // Prior full year of data
    const url = `${baseUrl}/api/analytics.json?dimension=dx:${indicatorCode}&dimension=pe:${year}&dimension=ou:LEVEL-1`;
    const headers = {
      Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`,
      Accept: "application/json",
    };

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;

    const data = await response.json();
    const rows = data?.rows;
    if (!rows?.length) return null;

    const value = parseFloat(rows[0][rows[0].length - 1]);
    return isNaN(value) ? null : { value, year };
  } catch {
    return null;
  }
}

// ── Main Inngest function ─────────────────────────────────────────────────────
export const syncHealthDataJob = inngest.createFunction(
  {
    id: "sync-health-data",
    name: "Sync Health Indicators (WHO + DHIS2)",
    triggers: [
      { cron: "0 3 * * 1" }, // Every Monday at 3:00 AM UTC (after scraper jobs)
    ],
  },
  async ({ step }) => {
    // 1. Upsert indicator definitions
    await step.run("upsert-indicators", async () => {
      for (const ind of INDICATORS) {
        await db
          .insert(healthIndicators)
          .values({ code: ind.code, name: ind.name, unit: ind.unit, category: ind.category })
          .onConflictDoUpdate({
            target: healthIndicators.code,
            set: { name: ind.name, unit: ind.unit, category: ind.category },
          });
      }
      console.log(`[sync-health-data] Upserted ${INDICATORS.length} indicator definitions.`);
    });

    let totalPoints = 0;

    // 2. Fetch from WHO GHO for all EAC countries
    await step.run("fetch-who-data", async () => {
      for (const countryCode of EAC_COUNTRIES) {
        const whoCountry = WHO_COUNTRY_MAP[countryCode];

        // Resolve country DB id
        const countryRow = await db
          .select({ id: countries.id })
          .from(countries)
          .where(eq(countries.code, countryCode))
          .limit(1);
        if (!countryRow.length) continue;
        const countryId = countryRow[0].id;

        for (const indicator of INDICATORS) {
          const whoCode = WHO_INDICATOR_MAP[indicator.code];
          if (!whoCode) continue;

          const point = await fetchWHOIndicator(indicator.code, whoCode, whoCountry);
          if (!point) continue;

          // Get indicator DB id
          const indRow = await db
            .select({ id: healthIndicators.id })
            .from(healthIndicators)
            .where(eq(healthIndicators.code, indicator.code))
            .limit(1);
          if (!indRow.length) continue;

          await db
            .insert(healthDataPoints)
            .values({
              indicatorId: indRow[0].id,
              countryId,
              value: String(point.value),
              year: point.year,
              source: "WHO GHO",
            })
            .onConflictDoNothing();

          totalPoints++;
        }
      }
      console.log(`[sync-health-data] WHO GHO: inserted/found ${totalPoints} data points.`);
    });

    // 3. Fetch from Tanzania DHIS2 (if credentials are set)
    await step.run("fetch-dhis2-data", async () => {
      for (const config of DHIS2_COUNTRIES) {
        if (!config.baseUrl) continue;

        const countryRow = await db
          .select({ id: countries.id })
          .from(countries)
          .where(eq(countries.code, config.countryCode))
          .limit(1);
        if (!countryRow.length) continue;
        const countryId = countryRow[0].id;

        for (const indicator of INDICATORS) {
          const point = await fetchDHIS2Indicator(
            indicator.dhis2Id ?? indicator.code,
            config.baseUrl,
            config.user,
            config.pass,
          );
          if (!point) continue;

          const indRow = await db
            .select({ id: healthIndicators.id })
            .from(healthIndicators)
            .where(eq(healthIndicators.code, indicator.code))
            .limit(1);
          if (!indRow.length) continue;

          await db
            .insert(healthDataPoints)
            .values({
              indicatorId: indRow[0].id,
              countryId,
              value: String(point.value),
              year: point.year,
              period: String(point.year),
              source: "DHIS2",
            })
            .onConflictDoNothing();

          totalPoints++;
        }

        console.log(`[sync-health-data] DHIS2 ${config.name}: processed.`);
      }
    });

    return {
      message: `Health data sync complete. Processed ${totalPoints} data points across ${EAC_COUNTRIES.length} countries.`,
    };
  },
);