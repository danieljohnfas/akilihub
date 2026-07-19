import { db } from '../db/client';
import { healthIndicators, healthDataPoints } from '../db/schema/health';
import { countries } from '../db/schema/shared';
import { eq, and } from 'drizzle-orm';

/**
 * REAL DATA SOURCES — No mock data anywhere.
 *
 * Primary:  World Bank Open Data API (api.worldbank.org/v2)
 *   - Free, no auth, updated quarterly, covers all 6 countries
 *   - Docs: https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
 *
 * Secondary: WHO Global Health Observatory (ghoapi.azureedge.net/api)
 *   - Free, no auth, used as fallback for indicators not in World Bank
 */

// ── World Bank indicators ────────────────────────────────────────────────────
const WB_INDICATORS: Record<string, { code: string; name: string; category: string; unit: string }> = {
  MMR:        { code: 'SH.STA.MMRT',     name: 'Maternal Mortality Ratio',                category: 'maternal',   unit: 'per 100,000 live births' },
  U5MR:       { code: 'SH.DYN.MORT',     name: 'Under-5 Mortality Rate',                  category: 'child',      unit: 'per 1,000 live births' },
  HIV_PREV:   { code: 'SH.DYN.AIDS.ZS',  name: 'HIV Prevalence (adults, % of 15-49)',     category: 'hiv',        unit: '%' },
  TB_INC:     { code: 'SH.TBS.INCD',     name: 'Tuberculosis Incidence Rate',              category: 'infectious', unit: 'per 100,000' },
  LIFE_EXP:   { code: 'SP.DYN.LE00.IN',  name: 'Life Expectancy at Birth',                category: 'general',    unit: 'years' },
  UHC_INDEX:  { code: 'SH.UHC.SRVS.CV.XD', name: 'UHC Service Coverage Index',           category: 'general',    unit: 'index' },
  DPT_VACC:   { code: 'SH.IMM.IDPT',     name: 'DPT Immunization (% of children)',        category: 'child',      unit: '%' },
  ANC_VISITS: { code: 'SH.ANM.NPRG.ZS',  name: 'Antenatal care coverage (at least 1 visit)', category: 'maternal', unit: '%' },
  HEALTH_EXP: { code: 'SH.XPD.CHEX.GD.ZS', name: 'Health Expenditure (% of GDP)',        category: 'general',    unit: '%' },
  MALARIA_INC:{ code: 'SH.MLR.INCD.P3',  name: 'Malaria Incidence (per 1,000 at risk)',   category: 'infectious', unit: 'per 1,000' },
};

// WHO GHO fallback — only for indicators not available in World Bank
const WHO_FALLBACK_INDICATORS: Record<string, { code: string; name: string; category: string; unit: string }> = {
  STUNTING:   { code: 'NUTRITION_548',   name: 'Stunting prevalence (under 5)',            category: 'nutrition',  unit: '%' },
  SBA:        { code: 'WHOSIS_000008',   name: 'Births attended by skilled health personnel', category: 'maternal', unit: '%' },
};

// ISO2 → ISO3 for WB API
const ISO2_TO_ISO3: Record<string, string> = {
  KE: 'KEN', TZ: 'TZA', UG: 'UGA', RW: 'RWA', ET: 'ETH', CD: 'COD',
};
// ISO3 → ISO2 for WHO GHO
const ISO3_TO_ISO2: Record<string, string> = {
  KEN: 'KE', TZA: 'TZ', UGA: 'UG', RWA: 'RW', ETH: 'ET', COD: 'CD',
};

const COUNTRIES = ['KE', 'TZ', 'UG', 'RW', 'ET', 'CD'];

// ── World Bank fetcher ────────────────────────────────────────────────────────
async function fetchWorldBankIndicator(key: string): Promise<number> {
  const indicator = WB_INDICATORS[key];
  if (!indicator) return 0;

  const iso3Countries = COUNTRIES.map(c => ISO2_TO_ISO3[c]).join(';');
  // mrv=5 = Most Recent Values for the past 5 years
  const url = `https://api.worldbank.org/v2/country/${iso3Countries}/indicator/${indicator.code}?format=json&per_page=60&mrv=5`;

  console.log(`[WorldBank] Fetching ${indicator.name} (${indicator.code})...`);

  let rows: Array<{ country: { id: string }; date: string; value: number | null }> = [];

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(45000), // WB multi-country queries can be slow
    });
    if (!res.ok) throw new Error(`World Bank API returned ${res.status}`);
    const [, data] = await res.json() as [unknown, typeof rows];
    rows = (data ?? []).filter(r => r.value !== null);
    console.log(`[WorldBank] Received ${rows.length} data points for ${key}`);
  } catch (err) {
    console.error(`[WorldBank] Failed to fetch ${key}:`, err);
    return 0;
  }

  if (rows.length === 0) return 0;
  return await upsertHealthPoints(indicator, rows.map(r => ({
    iso2: r.country.id,
    year: parseInt(r.date, 10),
    value: r.value!,
    source: 'World Bank Open Data',
  })));
}

// ── WHO GHO fetcher ───────────────────────────────────────────────────────────
async function fetchWHOFallbackIndicator(key: string): Promise<number> {
  const indicator = WHO_FALLBACK_INDICATORS[key];
  if (!indicator) return 0;

  const iso3List = COUNTRIES.map(c => ISO2_TO_ISO3[c]).map(c => `'${c}'`).join(',');
  const url = `https://ghoapi.azureedge.net/api/${indicator.code}?$filter=SpatialDim in (${iso3List})&$orderby=TimeDim desc&$top=30`;

  console.log(`[WHO GHO] Fetching ${indicator.name} (${indicator.code})...`);

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) throw new Error(`WHO GHO API returned ${res.status}`);
    const json = await res.json();
    const rows = ((json.value ?? []) as Array<{ SpatialDim: string; TimeDim: string; NumericValue: number | null }>)
      .filter(r => r.NumericValue !== null && ISO3_TO_ISO2[r.SpatialDim]);

    console.log(`[WHO GHO] Received ${rows.length} data points for ${key}`);
    if (rows.length === 0) return 0;

    return await upsertHealthPoints(indicator, rows.map(r => ({
      iso2: ISO3_TO_ISO2[r.SpatialDim],
      year: parseInt(r.TimeDim, 10),
      value: r.NumericValue!,
      source: 'WHO Global Health Observatory',
    })));
  } catch (err) {
    console.error(`[WHO GHO] Failed to fetch ${key}:`, err);
    return 0;
  }
}

// ── Shared DB upsert ──────────────────────────────────────────────────────────
async function upsertHealthPoints(
  indicator: { code: string; name: string; category: string; unit: string },
  points: Array<{ iso2: string; year: number; value: number; source: string }>
): Promise<number> {
  // Ensure indicator exists
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

  // Load country IDs
  const countryRows = await db.select({ id: countries.id, code: countries.code }).from(countries);
  const countryIdMap = Object.fromEntries(countryRows.map(c => [c.code, c.id]));

  const dbPoints = points
    .filter(p => countryIdMap[p.iso2])
    .map(p => ({
      indicatorId: dbIndicator.id,
      countryId: countryIdMap[p.iso2],
      value: p.value.toString(),
      year: p.year,
      period: p.year.toString(),
      source: p.source,
    }));

  if (dbPoints.length === 0) return 0;

  const inserted = await db
    .insert(healthDataPoints)
    .values(dbPoints)
    .onConflictDoNothing()
    .returning({ id: healthDataPoints.id });

  console.log(`[Health] Upserted ${inserted.length} data points for ${indicator.name}`);
  return inserted.length;
}

// ── Main entrypoint ────────────────────────────────────────────────────────────
export async function fetchAllHealthIndicators(): Promise<number> {
  let total = 0;

  // World Bank indicators (primary source)
  for (const key of Object.keys(WB_INDICATORS)) {
    try {
      total += await fetchWorldBankIndicator(key);
      await new Promise(r => setTimeout(r, 300)); // polite delay
    } catch (err) {
      console.error(`[Health] Failed indicator ${key}:`, err);
    }
  }

  // WHO GHO fallback indicators
  for (const key of Object.keys(WHO_FALLBACK_INDICATORS)) {
    try {
      total += await fetchWHOFallbackIndicator(key);
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`[Health] Failed WHO fallback ${key}:`, err);
    }
  }

  console.log(`[Health] Total new data points inserted: ${total}`);
  return total;
}
