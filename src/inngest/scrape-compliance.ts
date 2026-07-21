import { inngest } from "./client";
import { discoverCompliance, BroadComplianceResource } from "@/lib/scrapers/broad-search-engine-compliance";
import { db } from "@/lib/db/client";
import { complianceRequirements } from "@/lib/db/schema/compliance";
import { countries } from "@/lib/db/schema/shared";
import { eq } from "drizzle-orm";

export async function saveComplianceDb(discovered: BroadComplianceResource[], countryCode: string): Promise<number> {
  const result = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, countryCode)).limit(1);
  const countryId = result.length > 0 ? result[0].id : null;
  if (!countryId) return 0;

  let insertedCount = 0;
  for (const c of discovered) {
    try {
      await db.insert(complianceRequirements).values({
        title: c.title,
        description: c.description,
        countryId,
        category: c.category,
        issuingAuthority: c.issuingAuthority,
        resourceType: c.resourceType,
        sourceUrl: c.sourceUrl,
        isActive: true,
      }).onConflictDoNothing({ target: [complianceRequirements.title, complianceRequirements.countryId] });
      insertedCount++;
    } catch (e) {
      console.error(`Failed to insert compliance: ${c.title}`, e);
    }
  }
  return insertedCount;
}



function makeComplianceScraper(id: string, name: string, cron: string, query: string, countryCode: string) {
  return inngest.createFunction(
    { id, name, triggers: [{ cron }] },
    async ({ step }) => {
      const insertedCount = await step.run("execute-compliance-scraper", async () => {
        const discovered = await discoverCompliance(query, 1);
        return await saveComplianceDb(discovered, countryCode);
      });
      return { message: `Scraped and inserted ${insertedCount} compliance resources for ${name}.` };
    }
  );
}

export const scrapeComplianceKenyaJob = makeComplianceScraper('scrape-compliance-kenya', '🇰🇪 Compliance Kenya', '0 3 * * *', 'business registration tax compliance KRA BRS Kenya forms', 'KE');
export const scrapeComplianceTanzaniaJob = makeComplianceScraper('scrape-compliance-tanzania', '🇹🇿 Compliance Tanzania', '15 3 * * *', 'business registration tax compliance TRA BRELA Tanzania forms', 'TZ');
export const scrapeComplianceUgandaJob = makeComplianceScraper('scrape-compliance-uganda', '🇺🇬 Compliance Uganda', '30 3 * * *', 'business registration tax compliance URA URSB Uganda forms', 'UG');
export const scrapeComplianceRwandaJob = makeComplianceScraper('scrape-compliance-rwanda', '🇷🇼 Compliance Rwanda', '45 3 * * *', 'business registration tax compliance RRA RDB Rwanda forms', 'RW');
export const scrapeComplianceEthiopiaJob = makeComplianceScraper('scrape-compliance-ethiopia', '🇪🇹 Compliance Ethiopia', '0 4 * * *', 'business registration tax compliance Ethiopia forms', 'ET');
export const scrapeComplianceDRCJob = makeComplianceScraper('scrape-compliance-drc', '🇨🇩 Compliance DRC', '15 4 * * *', 'enregistrement entreprise conformite fiscale DGI RDC formulaires', 'CD');
