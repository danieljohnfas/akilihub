import { db, safeQuery } from '../db/client';
import { regions } from '../db/schema/shared';

// In-memory cache for regions to avoid thousands of DB lookups
const regionCache = new Map<string, string>(); // "countryCode:regionName" -> regionId
const cachedCountries: { id: string; code: string }[] | null = null;

const COMMON_REGIONS: Record<string, string> = {
  nairobi: 'Nairobi',
  mombasa: 'Mombasa',
  kisumu: 'Kisumu',
  nakuru: 'Nakuru',
  eldoret: 'Eldoret',
  'dar es salaam': 'Dar es Salaam',
  dodoma: 'Dodoma',
  arusha: 'Arusha',
  mwanza: 'Mwanza',
  kampala: 'Kampala',
  entebbe: 'Entebbe',
  jinja: 'Jinja',
  gulu: 'Gulu',
  kigali: 'Kigali',
  butare: 'Huye',
  gisenyi: 'Rubavu',
  'addis ababa': 'Addis Ababa',
  dire_dawa: 'Dire Dawa',
  kinshasa: 'Kinshasa',
  lubumbashi: 'Haut-Katanga',
  goma: 'North Kivu',
  bujumbura: 'Bujumbura',
  gitega: 'Gitega',
  mogadishu: 'Banaadir',
  hargeisa: 'Maroodi Jeex',
  juba: 'Central Equatoria',
};

let regionsLoaded = false;
async function preloadRegions() {
  if (regionsLoaded) return;
  try {
    const all = await safeQuery(db.select({ id: regions.id, name: regions.name }).from(regions));
    if (all) {
      for (const r of all) {
        regionCache.set(`name:${r.name.toLowerCase()}`, r.id);
      }
      regionsLoaded = true;
    }
  } catch {
    // ignore
  }
}

export async function normalizeLocationAndGetRegionId(rawLocation: string | null): Promise<string | null> {
  if (!rawLocation || rawLocation.trim() === '') return null;
  const lower = rawLocation.toLowerCase();

  await preloadRegions();

  // Fast heuristic lookup for top regions
  for (const [key, regionName] of Object.entries(COMMON_REGIONS)) {
    if (lower.includes(key)) {
      const found = regionCache.get(`name:${regionName.toLowerCase()}`);
      if (found) return found;
    }
  }

  return null;
}

