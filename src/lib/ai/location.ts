import { z } from 'zod';
import { db, safeQuery } from '../db/client';
import { countries, regions } from '../db/schema/shared';
import { eq, and } from 'drizzle-orm';
import { generateObjectWithFallback } from './router';

// In-memory cache for countries to prevent excessive DB lookups
let cachedCountries: { id: string, code: string }[] | null = null;

async function getCountries() {
  if (cachedCountries) return cachedCountries;
  const res = await safeQuery(db.select({ id: countries.id, code: countries.code }).from(countries));
  cachedCountries = res || [];
  return cachedCountries;
}

export async function normalizeLocationAndGetRegionId(rawLocation: string | null): Promise<string | null> {
  if (!rawLocation || rawLocation.trim() === '') return null;

  try {
    const prompt = `You are a geographical normalization AI.
Analyze the following raw location string extracted from a job or tender posting in East Africa.
Determine the most likely ISO 3166-1 alpha-2 country code (KE, TZ, UG, RW) and the top-level administrative region (e.g. County in Kenya, Region in Tanzania).
If the location is "Remote" or cannot be mapped to a specific region, leave regionName null.
If the country cannot be determined, guess based on context or leave countryCode null.

Raw Location: "${rawLocation}"
`;

    const { object } = await generateObjectWithFallback({
      schema: z.object({
        countryCode: z.enum(['KE', 'TZ', 'UG', 'RW']).nullable(),
        regionName: z.string().nullable().describe("The official name of the top-level region (e.g., 'Nairobi', 'Dar es Salaam', 'Kigali'). Do not include suffixes like 'County' or 'Region'."),
      }),
      prompt,
    });

    if (!object.countryCode || !object.regionName) {
      return null;
    }

    const availableCountries = await getCountries();
    const country = availableCountries.find(c => c.code === object.countryCode);
    
    if (!country) return null; // We only support the core 4 countries right now

    // Check if the region exists in the database
    const existingRegion = await safeQuery(
      db.select({ id: regions.id })
        .from(regions)
        .where(and(eq(regions.countryId, country.id), eq(regions.name, object.regionName)))
        .limit(1)
    );

    if (existingRegion && existingRegion.length > 0) {
      return existingRegion[0].id;
    }

    // Dynamic population: Region doesn't exist, insert it!
    const newRegion = await safeQuery(
      db.insert(regions).values({
        countryId: country.id,
        name: object.regionName,
      }).returning({ id: regions.id })
    );

    return newRegion?.[0]?.id || null;

  } catch (error) {
    console.error(`[normalizeLocation] Failed to normalize: ${rawLocation}`, error);
    return null;
  }
}
