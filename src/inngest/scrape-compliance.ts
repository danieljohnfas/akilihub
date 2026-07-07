import { inngest } from "./client";
import { discoverCompliance, BroadComplianceResource } from "@/lib/scrapers/broad-search-engine-compliance";
import { db } from "@/lib/db/client";
import { complianceRequirements } from "@/lib/db/schema/compliance";
import { countries } from "@/lib/db/schema/shared";
import { eq } from "drizzle-orm";

async function getCountryId(countryHint: string): Promise<string | null> {
  const result = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, countryHint)).limit(1);
  return result.length > 0 ? result[0].id : null;
}

async function saveCompliance(discovered: BroadComplianceResource[], countryCode: string): Promise<number> {
  const countryId = await getCountryId(countryCode);
  if (!countryId) return 0;

  let inserted = 0;
  for (const resource of discovered) {
    try {
      await db.insert(complianceRequirements).values({
        title: resource.title,
        description: resource.description,
        category: resource.category,
        issuingAuthority: resource.issuingAuthority,
        resourceType: resource.resourceType,
        sourceUrl: resource.sourceUrl,
        countryId,
        isActive: true,
      }).onConflictDoNothing();
      inserted++;
    } catch (e) {
      console.error(`Failed to insert compliance resource: ${resource.title}`, e);
    }
  }
  return inserted;
}

function makeComplianceJob(
  id: string,
  name: string,
  cron: string,
  query: string,
  countryCode: string
) {
  return inngest.createFunction(
    { id, name, triggers: [{ cron }] },
    async ({ step }) => {
      const insertedCount = await step.run("execute-compliance-scraper", async () => {
        const discovered = await discoverCompliance(query, 3);
        return await saveCompliance(discovered, countryCode);
      });

      return { message: `Scraped and inserted ${insertedCount} resources for ${name}.` };
    }
  );
}

// Daily jobs staggered by 30 min (Moved from weekly Sunday)
export const scrapeTRAResourcesJob   = makeComplianceJob("scrape-tra-resources",   "🇹🇿 Compliance Tanzania", "0 3 * * *",  "TRA Tanzania tax compliance guidelines forms 2026", "TZ");
export const scrapeKRAResourcesJob   = makeComplianceJob("scrape-kra-resources",   "🇰🇪 Compliance Kenya",    "30 3 * * *", "KRA Kenya tax compliance guidelines forms 2026", "KE");
export const scrapeBRELAResourcesJob = makeComplianceJob("scrape-brela-resources", "🇹🇿 Compliance BRELA",    "0 4 * * *",  "BRELA Tanzania business registration forms 2026", "TZ");
