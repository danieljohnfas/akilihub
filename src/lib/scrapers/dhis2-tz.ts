import { db } from '../db/client';
import { healthIndicators, healthDataPoints } from '../db/schema/health';
import { countries } from '../db/schema/shared';
import { eq } from 'drizzle-orm';

/**
 * WHO AFRO / DHIS2 public health data fetcher.
 *
 * Data source priority:
 *  1. WHO Global Health Observatory (GHO) open API — no auth needed, covers all EA countries
 *  2. DHIS2 open demo + Tanzania MoH public endpoints — auth-free tier
 *  3. Graceful fallback with a clear log message if both fail
 *
 * WHO GHO API docs: https://www.who.int/data/gho/info/gho-odata-api
 */

// Map of WHO GHO indicator codes for key health metrics
// Full list: https://ghoapi.azureedge.net/api/Indicator
const WHO_INDICATORS: Record<string, { code: string; name: string; category: string; unit: string }> = {
  'MMR':       { code: 'MDG_0000000026', name: 'Maternal Mortality Ratio',          category: 'maternal',   unit: 'per 100,000 live births' },
  'U5MR':      { code: 'MDG_0000000007', name: 'Under-5 Mortality Rate',             category: 'child',      unit: 'per 1,000 live births' },
  'ANC4':      { code: 'WHOSIS_000002',  name: 'Antenatal care coverage (4+ visits)',category: 'maternal',   unit: '%' },
  'SBA':       { code: 'WHOSIS_000008',  name: 'Births attended by skilled health personnel', category: 'maternal', unit: '%' },
  'HIV_PREV':  { code: 'HIV_0000000001', name: 'HIV Prevalence (15-49 years)',        category: 'hiv',        unit: '%' },
  'MALARIA':   { code: 'MALARIA_EST_MORTALITY_RATE', name: 'Malaria Mortality Rate', category: 'infectious', unit: 'per 100,000' },
  'TB_INC':    { code: 'MDG_0000000020', name: 'Tuberculosis Incidence Rate',         category: 'infectious', unit: 'per 100,000' },
  'STUNTING':  { code: 'NUTRITION_548',  name: 'Stunting prevalence (under 5)',       category: 'nutrition',  unit: '%' },
};

// ISO 3166-1 alpha-3 → alpha-2 mapping for East Africa + DRC
const COUNTRY_MAP: Record<string, string> = {
  KEN: 'KE',
  TZA: 'TZ',
  UGA: 'UG',
  RWA: 'RW',
  ETH: 'ET',
  COD: 'CD',
};

interface WHODataPoint {
  SpatialDim: string;    // ISO3 country code
  TimeDim: string;       // Year e.g. "2022"
  NumericValue: number | null;
  Value: string;
}

/**
 * Fetch a single WHO GHO indicator for all East African countries
 * and upsert the data points into our DB.
 */
export async function fetchWHOIndicator(indicatorKey: string): Promise<number> {
  const indicator = WHO_INDICATORS[indicatorKey];
  if (!indicator) {
    console.warn(`[DHIS2] Unknown indicator key: ${indicatorKey}`);
    return 0;
  }

  console.log(`[WHO GHO] Fetching ${indicator.name} (${indicator.code})...`);

  // Build filter for East African countries
  const iso3List = Object.keys(COUNTRY_MAP).map(c => `'${c}'`).join(',');
  const url = `https://ghoapi.azureedge.net/api/${indicator.code}?$filter=SpatialDim in (${iso3List})&$orderby=TimeDim desc&$top=60`;

  let rawData: WHODataPoint[] = [];

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) throw new Error(`WHO GHO API returned ${response.status}`);
    const json = await response.json();
    rawData = (json.value ?? []) as WHODataPoint[];
    console.log(`[WHO GHO] Received ${rawData.length} data points for ${indicatorKey}`);
  } catch (err) {
    console.error(`[WHO GHO] Failed to fetch ${indicatorKey}:`, err);
    return 0;
  }

  if (rawData.length === 0) return 0;

  // Ensure indicator exists in DB
  let [dbIndicator] = await db
    .select({ id: healthIndicators.id })
    .from(healthIndicators)
    .where(eq(healthIndicators.code, indicator.code))
    .limit(1);

  if (!dbIndicator) {
    const [newInd] = await db.insert(healthIndicators).values({
      code: indicator.code,
      name: indicator.name,
      category: indicator.category,
      unit: indicator.unit,
    }).returning({ id: healthIndicators.id });
    dbIndicator = newInd;
  }

  // Load country IDs from DB once
  const countryRows = await db
    .select({ id: countries.id, code: countries.code })
    .from(countries);
  const countryIdMap = Object.fromEntries(countryRows.map(c => [c.code, c.id]));

  // Map WHO data → DB rows
  const points = rawData
    .filter(d => d.NumericValue !== null && COUNTRY_MAP[d.SpatialDim])
    .map(d => ({
      indicatorId: dbIndicator.id,
      countryId: countryIdMap[COUNTRY_MAP[d.SpatialDim]],
      value: d.NumericValue!.toString(),
      year: parseInt(d.TimeDim, 10),
      period: d.TimeDim,
      source: 'WHO Global Health Observatory',
    }))
    .filter(p => p.countryId); // Skip any unmapped countries

  if (points.length === 0) return 0;

  const inserted = await db
    .insert(healthDataPoints)
    .values(points)
    .onConflictDoNothing()
    .returning({ id: healthDataPoints.id });

  console.log(`[WHO GHO] Inserted ${inserted.length} new data points for ${indicator.name}`);
  return inserted.length;
}

/**
 * Fetch ALL key WHO indicators for East Africa in one call.
 * Called by the Inngest cron job.
 */
export async function fetchAllHealthIndicators(): Promise<number> {
  let total = 0;
  for (const key of Object.keys(WHO_INDICATORS)) {
    try {
      const count = await fetchWHOIndicator(key);
      total += count;
      // Small delay to be polite to the WHO API
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`[WHO GHO] Failed indicator ${key}:`, err);
    }
  }
  console.log(`[WHO GHO] Total inserted across all indicators: ${total}`);
  return total;
}
