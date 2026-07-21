import { normalizeLocationAndGetRegionId } from './src/lib/ai/location';
import { db, safeQuery } from './src/lib/db/client';
import { regions, countries } from './src/lib/db/schema/shared';
import { eq } from 'drizzle-orm';

async function test() {
  console.log("Testing location normalization...");
  
  const testCases = [
    "Nairobi, Kenya",
    "Dar es Salaam Region",
    "Kigali City",
    "Kampala, Uganda - Remote",
    "Ministry of Health, Nairobi County",
    "Unknown Location"
  ];

  for (const raw of testCases) {
    const regionId = await normalizeLocationAndGetRegionId(raw);
    if (regionId) {
      const regionData = await safeQuery(
        db.select({ name: regions.name, country: countries.name })
          .from(regions)
          .innerJoin(countries, eq(regions.countryId, countries.id))
          .where(eq(regions.id, regionId))
          .limit(1)
      );
      console.log(`[${raw}] -> Region: ${regionData?.[0]?.name}, Country: ${regionData?.[0]?.country}`);
    } else {
      console.log(`[${raw}] -> Could not normalize (Returned NULL)`);
    }
  }
  
  process.exit(0);
}

test();
