import { inngest } from "./client";
import { discoverCompliance, BroadComplianceResource } from "@/lib/scrapers/broad-search-engine-compliance";
import { db } from "@/lib/db/client";
import { complianceResources } from "@/lib/db/schema/compliance";
import { countries } from "@/lib/db/schema/shared";
import { eq } from "drizzle-orm";

const COMPLIANCE_TARGET = 10; // Second pass if below this threshold

async function getCountryId(countryHint: string): Promise<string | null> {
  const result = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, countryHint)).limit(1);
  return result.length > 0 ? result[0].id : null;
}

export async function saveCompliance(discovered: BroadComplianceResource[], countryCode: string): Promise<number> {
  const countryId = await getCountryId(countryCode);
  if (!countryId) return 0;

  let inserted = 0;
  for (const item of discovered) {
    try {
      const rows = await db.insert(complianceResources).values({
        title: item.title,
        description: item.description,
        category: item.category,
        issuingAuthority: item.issuingAuthority,
        resourceType: item.resourceType,
        sourceUrl: item.sourceUrl,
        countryId,
        isActive: true,
      }).onConflictDoNothing().returning({ id: complianceResources.id });
      if (rows.length > 0) inserted++;
    } catch (e) {
      console.error(`Failed to insert compliance resource: ${item.title}`, e);
    }
  }
  return inserted;
}

export { saveCompliance as saveComplianceDb };

// ── Run all queries for a country ─────────────────────────────────────────────
async function runComplianceQueries(queries: string[], countryCode: string, label: string): Promise<number> {
  let total = 0;
  for (let i = 0; i < queries.length; i++) {
    try {
      const discovered = await discoverCompliance(queries[i], 5);
      const inserted = await saveCompliance(discovered, countryCode);
      total += inserted;
      console.log(`[${label}] q${i}: "${queries[i]}" → +${inserted} (running: ${total})`);
    } catch (e) {
      console.error(`[${label}] q${i} failed: ${(e as Error).message}`);
    }
  }
  return total;
}

function makeComplianceScraper(
  id: string,
  name: string,
  cron: string,
  queries: string[],
  countryCode: string
) {
  return inngest.createFunction(
    { id, name, triggers: [{ cron }, { event: "manual.scrape.compliance" }] },
    async ({ step }) => {
      const pass1 = await step.run(`execute-compliance-scraper-pass1`, async () => {
        return await runComplianceQueries(queries, countryCode, `${id}-p1`);
      });

      let totalInserted = pass1;

      if (pass1 < COMPLIANCE_TARGET) {
        console.log(`[${id}] Pass 1 yielded ${pass1} — under target ${COMPLIANCE_TARGET}. Running second pass...`);
        const pass2 = await step.run(`execute-compliance-scraper-pass2`, async () => {
          return await runComplianceQueries(queries, countryCode, `${id}-p2`);
        });
        totalInserted += pass2;
      }

      return { message: `Scraped and inserted ${totalInserted} compliance resources for ${name}.`, totalInserted };
    }
  );
}

// ── Kenya (KE) ────────────────────────────────────────────────────────
export const scrapeComplianceKenyaJob = makeComplianceScraper(
  "scrape-compliance-kenya", "🇰🇪 Compliance Kenya", "0 0 * * *",
  [
    "Kenya Revenue Authority KRA tax compliance forms 2026",
    "Business registration service BRS Kenya company formation 2026",
    "NEMA Kenya environmental compliance guidelines 2026",
    "Ministry of Labour Kenya employment laws compliance 2026",
    "NSSF NHIF compliance requirements Kenya 2026",
  ],
  "KE"
);

// ── Tanzania (TZ) ───────────────────────────────────────────────────────
export const scrapeComplianceTanzaniaJob = makeComplianceScraper(
  "scrape-compliance-tanzania", "🇹🇿 Compliance Tanzania", "30 0 * * *",
  [
    "Tanzania Revenue Authority TRA tax compliance 2026",
    "BRELA Tanzania business registration forms 2026",
    "NEMC Tanzania environmental compliance 2026",
    "OSHA Tanzania workplace safety guidelines 2026",
    "NSSF Tanzania compliance guidelines 2026",
  ],
  "TZ"
);

// ── Uganda (UG) ─────────────────────────────────────────────────────────
export const scrapeComplianceUgandaJob = makeComplianceScraper(
  "scrape-compliance-uganda", "🇺🇬 Compliance Uganda", "0 1 * * *",
  [
    "Uganda Revenue Authority URA tax compliance forms 2026",
    "URSB Uganda business registration guidelines 2026",
    "NEMA Uganda environmental compliance 2026",
    "Ministry of Gender Labour Uganda employment guidelines 2026",
    "NSSF Uganda compliance requirements 2026",
  ],
  "UG"
);

// ── Rwanda (RW) ─────────────────────────────────────────────────────────
export const scrapeComplianceRwandaJob = makeComplianceScraper(
  "scrape-compliance-rwanda", "🇷🇼 Compliance Rwanda", "30 1 * * *",
  [
    "Rwanda Revenue Authority RRA tax compliance forms 2026",
    "RDB Rwanda Development Board business registration 2026",
    "REMA Rwanda environmental compliance guidelines 2026",
    "Ministry of Public Service and Labour Rwanda compliance 2026",
    "RSSB Rwanda pension compliance 2026",
  ],
  "RW"
);

// ── Ethiopia (ET) ───────────────────────────────────────────────────────
export const scrapeComplianceEthiopiaJob = makeComplianceScraper(
  "scrape-compliance-ethiopia", "🇪🇹 Compliance Ethiopia", "0 2 * * *",
  [
    "Ministry of Revenues Ethiopia tax compliance 2026",
    "Ministry of Trade and Industry Ethiopia business registration 2026",
    "Ethiopia Environment Forest Climate Change Commission compliance 2026",
    "Ministry of Labour and Skills Ethiopia employment guidelines 2026",
    "Ethiopian Customs Commission guidelines 2026",
  ],
  "ET"
);

// ── DRC (CD) ────────────────────────────────────────────────────────────
export const scrapeComplianceDRCJob = makeComplianceScraper(
  "scrape-compliance-drc", "🇨🇩 Compliance DRC", "30 2 * * *",
  [
    "Direction Générale des Impôts DGI RDC conformité fiscale 2026",
    "Guichet Unique de Création d'Entreprise GUCE RDC 2026",
    "Ministère de l'Environnement RDC conformité environnementale 2026",
    "Code du travail RDC conformité employeur 2026",
    "INPP CNSS RDC cotisations sociales 2026",
  ],
  "CD"
);

// ── Burundi (BI) ────────────────────────────────────────────────────────────
export const scrapeComplianceBurundiJob = makeComplianceScraper(
  "scrape-compliance-burundi", "🇧🇮 Compliance Burundi", "0 3 * * *",
  [
    "Office Burundais des Recettes OBR conformité fiscale 2026",
    "Agence de Promotion des Investissements API Burundi création entreprise 2026",
    "OBPE Burundi conformité environnementale 2026",
    "Code du travail Burundi conformité employeur 2026",
    "INSS Burundi cotisations sociales 2026",
  ],
  "BI"
);

// ── Somalia (SO) ────────────────────────────────────────────────────────────
export const scrapeComplianceSomaliaJob = makeComplianceScraper(
  "scrape-compliance-somalia", "🇸🇴 Compliance Somalia", "30 3 * * *",
  [
    "Ministry of Finance Somalia tax compliance 2026",
    "Ministry of Commerce and Industry Somalia business registration 2026",
    "Directorate of Environment and Climate Change Somalia compliance 2026",
    "Ministry of Labour and Social Affairs Somalia employment guidelines 2026",
    "Central Bank of Somalia financial compliance 2026",
  ],
  "SO"
);

// ── South Sudan (SS) ────────────────────────────────────────────────────────────
export const scrapeComplianceSouthSudanJob = makeComplianceScraper(
  "scrape-compliance-south-sudan", "🇸🇸 Compliance South Sudan", "0 4 * * *",
  [
    "National Revenue Authority NRA South Sudan tax compliance 2026",
    "Ministry of Trade and Industry South Sudan business registration 2026",
    "Ministry of Environment South Sudan compliance 2026",
    "Ministry of Labour South Sudan employment guidelines 2026",
    "South Sudan Customs Service guidelines 2026",
  ],
  "SS"
);
