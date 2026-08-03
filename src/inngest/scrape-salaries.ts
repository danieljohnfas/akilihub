import { inngest } from "./client";
import { discoverSalaries, BroadSalaryResource } from "@/lib/scrapers/broad-search-engine-salaries";
import { db } from "@/lib/db/client";
import { salarySubmissions } from "@/lib/db/schema/salaries";
import { countries } from "@/lib/db/schema/shared";
import { eq } from "drizzle-orm";

const SALARY_TARGET = 20; // Second pass if below this threshold

async function getCountryId(countryHint: string): Promise<string | null> {
  const result = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, countryHint)).limit(1);
  return result.length > 0 ? result[0].id : null;
}

export async function saveSalaries(discovered: BroadSalaryResource[], countryCode: string): Promise<number> {
  const countryId = await getCountryId(countryCode);
  if (!countryId) return 0;

  let inserted = 0;
  for (const item of discovered) {
    try {
      const rows = await db.insert(salarySubmissions).values({
        jobTitle: item.jobTitle,
        countryId,
        experienceLevel: item.experienceLevel,
        employmentType: item.employmentType,
        currency: item.currency,
        grossMonthlySalary: item.grossMonthlySalary.toString(),
        netMonthlySalary: item.netMonthlySalary?.toString() || null,
        yearsOfExperience: item.yearsOfExperience || null,
        isAnonymous: true,
        isVerified: true,
        sourceUrl: item.sourceUrl || null,
      }).onConflictDoNothing().returning({ id: salarySubmissions.id });
      if (rows.length > 0) inserted++;
    } catch (e) {
      console.error(`Failed to insert salary for: ${item.jobTitle}`, e);
    }
  }
  return inserted;
}

export { saveSalaries as saveSalariesDb };

// ── Run all queries for a country ─────────────────────────────────────────────
async function runSalaryQueries(queries: string[], countryCode: string, label: string): Promise<number> {
  let total = 0;
  for (let i = 0; i < queries.length; i++) {
    try {
      const discovered = await discoverSalaries(queries[i], 5);
      const inserted = await saveSalaries(discovered, countryCode);
      total += inserted;
      console.log(`[${label}] q${i}: "${queries[i]}" → +${inserted} (running: ${total})`);
    } catch (e) {
      console.error(`[${label}] q${i} failed: ${(e as Error).message}`);
    }
  }
  return total;
}

function makeSalaryScraper(
  id: string,
  name: string,
  cron: string,
  queries: string[],
  countryCode: string
) {
  return inngest.createFunction(
    { id, name, triggers: [{ cron }] },
    async ({ step }) => {
      const pass1 = await step.run(`execute-salary-scraper-pass1`, async () => {
        return await runSalaryQueries(queries, countryCode, `${id}-p1`);
      });

      let totalInserted = pass1;

      // Second pass if under target — same queries, new results possible daily
      if (pass1 < SALARY_TARGET) {
        console.log(`[${id}] Pass 1 yielded ${pass1} — under target ${SALARY_TARGET}. Running second pass...`);
        const pass2 = await step.run(`execute-salary-scraper-pass2`, async () => {
          return await runSalaryQueries(queries, countryCode, `${id}-p2`);
        });
        totalInserted += pass2;
      }

      return { message: `Scraped and inserted ${totalInserted} salaries for ${name}.`, totalInserted };
    }
  );
}

// ── Kenya (KE) ────────────────────────────────────────────────────────
export const scrapeSalariesKenyaJob = makeSalaryScraper(
  "scrape-salaries-kenya", "🇰🇪 Salaries Kenya", "30 1 * * *",
  [
    "software engineer developer salary Kenya 2026",
    "doctor nurse medical officer salary Kenya 2026",
    "teacher lecturer salary Kenya TSC 2026",
    "accountant finance manager salary Kenya 2026",
    "NGO project officer salary Kenya 2026",
    "government civil servant salary scale Kenya 2026",
    // ← from mass-scrape
    "humanitarian worker salary Kenya 2026",
  ],
  "KE"
);

// ── Tanzania (TZ) ───────────────────────────────────────────────────────
export const scrapeSalariesTanzaniaJob = makeSalaryScraper(
  "scrape-salaries-tanzania", "🇹🇿 Salaries Tanzania", "0 2 * * *",
  [
    "software developer IT salary Tanzania 2026",
    "mshahara wa daktari nesi Tanzania 2026",
    "mshahara wa mwalimu Tanzania 2026",
    "accountant bank officer salary Tanzania 2026",
    "mshahara wa mtumishi wa umma Tanzania 2026",
    "NGO project manager salary Tanzania 2026",
    // ← from mass-scrape
    "finance accounting ajira mshahara Tanzania 2026",
  ],
  "TZ"
);

// ── Uganda (UG) ─────────────────────────────────────────────────────────
export const scrapeSalariesUgandaJob = makeSalaryScraper(
  "scrape-salaries-uganda", "🇺🇬 Salaries Uganda", "30 2 * * *",
  [
    "software engineer salary Kampala Uganda 2026",
    "doctor nurse salary Uganda 2026",
    "teacher salary Uganda 2026",
    "finance accountant salary Uganda 2026",
    "civil servant government salary scale Uganda 2026",
    "NGO worker salary Uganda 2026",
  ],
  "UG"
);

// ── Rwanda (RW) ─────────────────────────────────────────────────────────
export const scrapeSalariesRwandaJob = makeSalaryScraper(
  "scrape-salaries-rwanda", "🇷🇼 Salaries Rwanda", "0 3 * * *",
  [
    "software engineer IT salary Rwanda 2026",
    "doctor nurse salary Rwanda Kigali 2026",
    "teacher salary Rwanda 2026",
    "banker accountant salary Rwanda 2026",
    "government employee salary scale Rwanda 2026",
    "NGO worker salary Rwanda 2026",
  ],
  "RW"
);

// ── Ethiopia (ET) ───────────────────────────────────────────────────────
export const scrapeSalariesEthiopiaJob = makeSalaryScraper(
  "scrape-salaries-ethiopia", "🇪🇹 Salaries Ethiopia", "30 3 * * *",
  [
    "software developer salary Ethiopia 2026",
    "doctor nurse health worker salary Ethiopia 2026",
    "teacher lecturer salary Ethiopia 2026",
    "accountant finance salary Ethiopia 2026",
    "government civil servant salary scale Ethiopia 2026",
    "NGO humanitarian worker salary Ethiopia 2026",
  ],
  "ET"
);

// ── DRC (CD) ────────────────────────────────────────────────────────────
export const scrapeSalariesDRCJob = makeSalaryScraper(
  "scrape-salaries-drc", "🇨🇩 Salaries DRC", "0 4 * * *",
  [
    "salaire développeur informaticien RDC 2026",
    "salaire médecin infirmier RDC 2026",
    "salaire enseignant professeur RDC 2026",
    "salaire comptable banquier RDC Congo 2026",
    "barème salarial fonctionnaire gouvernement RDC 2026",
    "salaire employé ONG humanitaire RDC 2026",
    "salaire ingénieur mines RDC Katanga 2026",
  ],
  "CD"
);

// ── Burundi (BI) ────────────────────────────────────────────────────────────
export const scrapeSalariesBurundiJob = makeSalaryScraper(
  "scrape-salaries-burundi", "🇧🇮 Salaries Burundi", "30 4 * * *",
  [
    "salaire développeur informatique Burundi 2026",
    "salaire médecin infirmier Burundi 2026",
    "salaire enseignant professeur Burundi 2026",
    "salaire comptable banque Burundi 2026",
    "barème salarial fonctionnaire Burundi 2026",
    "salaire employé ONG Burundi 2026",
    // ← from mass-scrape
    "barème salarial Burundi 2026",
  ],
  "BI"
);

// ── Somalia (SO) ────────────────────────────────────────────────────────────
export const scrapeSalariesSomaliaJob = makeSalaryScraper(
  "scrape-salaries-somalia", "🇸🇴 Salaries Somalia", "0 5 * * *",
  [
    "software developer IT salary Somalia 2026",
    "doctor nurse health worker salary Somalia 2026",
    "teacher lecturer salary Somalia 2026",
    "accountant finance salary Somalia 2026",
    "government civil servant salary scale Somalia 2026",
    "NGO humanitarian worker salary Somalia 2026",
  ],
  "SO"
);

// ── South Sudan (SS) ────────────────────────────────────────────────────────────
export const scrapeSalariesSouthSudanJob = makeSalaryScraper(
  "scrape-salaries-south-sudan", "🇸🇸 Salaries South Sudan", "30 5 * * *",
  [
    "software developer IT salary South Sudan 2026",
    "doctor nurse health worker salary South Sudan 2026",
    "teacher lecturer salary South Sudan 2026",
    "accountant finance salary South Sudan 2026",
    "government civil servant salary scale South Sudan 2026",
    "NGO humanitarian worker salary South Sudan 2026",
  ],
  "SS"
);
