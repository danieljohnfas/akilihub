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
