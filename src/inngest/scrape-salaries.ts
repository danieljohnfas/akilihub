import { inngest } from "./client";
import { discoverSalaries, BroadSalaryResource } from "@/lib/scrapers/broad-search-engine-salaries";
import { db } from "@/lib/db/client";
import { salarySubmissions, employers, jobCategories } from "@/lib/db/schema/salaries";
import { countries } from "@/lib/db/schema/shared";
import { eq } from "drizzle-orm";

export async function saveSalariesDb(discovered: BroadSalaryResource[], countryCode: string): Promise<number> {
  const result = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, countryCode)).limit(1);
  const countryId = result.length > 0 ? result[0].id : null;
  if (!countryId) return 0;

  let insertedCount = 0;
  for (const s of discovered) {
    try {
      // 1. Resolve Employer
      let empId: string | null = null;
      const empRes = await db.select({ id: employers.id }).from(employers).where(eq(employers.name, s.employerName)).limit(1);
      if (empRes.length > 0) {
        empId = empRes[0].id;
      } else {
        const newEmp = await db.insert(employers).values({ name: s.employerName, countryId }).returning({ id: employers.id });
        if (newEmp.length > 0) empId = newEmp[0].id;
      }

      // 2. Resolve Job Category
      let catId: string | null = null;
      const slug = s.jobCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const catRes = await db.select({ id: jobCategories.id }).from(jobCategories).where(eq(jobCategories.slug, slug)).limit(1);
      if (catRes.length > 0) {
        catId = catRes[0].id;
      } else {
        const newCat = await db.insert(jobCategories).values({ name: s.jobCategoryName, slug }).onConflictDoNothing().returning({ id: jobCategories.id });
        if (newCat.length > 0) catId = newCat[0].id;
        else {
          const catResRetry = await db.select({ id: jobCategories.id }).from(jobCategories).where(eq(jobCategories.slug, slug)).limit(1);
          if (catResRetry.length > 0) catId = catResRetry[0].id;
        }
      }

      if (!empId || !catId) continue;

      await db.insert(salarySubmissions).values({
        jobTitle: s.jobTitle,
        jobCategoryId: catId,
        employerId: empId,
        countryId,
        experienceLevel: s.experienceLevel,
        employmentType: s.employmentType,
        currency: s.currency,
        grossMonthlySalary: s.grossMonthlySalary.toString(),
        netMonthlySalary: s.netMonthlySalary ? s.netMonthlySalary.toString() : null,
        yearsOfExperience: s.yearsOfExperience,
        isAnonymous: false,
        isVerified: true,
      });
      insertedCount++;
    } catch (e) {
      console.error(`Failed to insert salary: ${s.jobTitle}`, e);
    }
  }
  return insertedCount;
}

import { inngest } from "./client";

function makeSalaryScraper(id: string, name: string, cron: string, query: string, countryCode: string) {
  return inngest.createFunction(
    { id, name, triggers: [{ cron }] },
    async ({ step }) => {
      const insertedCount = await step.run("execute-salary-scraper", async () => {
        const discovered = await discoverSalaries(query, 1);
        return await saveSalariesDb(discovered, countryCode);
      });
      return { message: `Scraped and inserted ${insertedCount} salaries for ${name}.` };
    }
  );
}

export const scrapeSalariesKenyaJob = makeSalaryScraper('scrape-salaries-kenya', '🇰🇪 Salaries Kenya', '0 7 * * *', 'average salary compensation benchmarks Kenya 2026', 'KE');
export const scrapeSalariesTanzaniaJob = makeSalaryScraper('scrape-salaries-tanzania', '🇹🇿 Salaries Tanzania', '15 7 * * *', 'average salary compensation benchmarks Tanzania 2026', 'TZ');
export const scrapeSalariesUgandaJob = makeSalaryScraper('scrape-salaries-uganda', '🇺🇬 Salaries Uganda', '30 7 * * *', 'average salary compensation benchmarks Uganda 2026', 'UG');
export const scrapeSalariesRwandaJob = makeSalaryScraper('scrape-salaries-rwanda', '🇷🇼 Salaries Rwanda', '45 7 * * *', 'average salary compensation benchmarks Rwanda 2026', 'RW');
export const scrapeSalariesEthiopiaJob = makeSalaryScraper('scrape-salaries-ethiopia', '🇪🇹 Salaries Ethiopia', '0 8 * * *', 'average salary compensation benchmarks Ethiopia 2026', 'ET');
export const scrapeSalariesDRCJob = makeSalaryScraper('scrape-salaries-drc', '🇨🇩 Salaries DRC', '15 8 * * *', 'salaire moyen remuneration RDC Congo 2026', 'CD');
