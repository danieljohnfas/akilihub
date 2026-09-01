import { runKnownSourcesForCountryProxy, runQueriesForCountryProxy } from "../inngest/scrape-jobs";
import { db } from "../lib/db/client";
import { jobs } from "../lib/db/schema/jobs";
import { countries as countriesTable } from "../lib/db/schema/shared";
import { count, eq } from "drizzle-orm";
import { generateText } from "ai";
import { getAiRouter } from "../ai/router";

const TARGET_JOBS_PER_COUNTRY = 2000;
// Make sure TZ is first, as requested by the user
const COUNTRIES = ['TZ', 'KE', 'UG', 'RW', 'ET', 'CD', 'BI', 'SO', 'SS'];

async function getJobCount(countryCode: string) {
  const [country] = await db.select({ id: countriesTable.id }).from(countriesTable).where(eq(countriesTable.code, countryCode)).limit(1);
  if (!country) return 0;
  
  const [res] = await db.select({ count: count() }).from(jobs).where(eq(jobs.countryId, country.id));
  return Number(res.count);
}

const INDUSTRIES = [
  "IT & Software", "Healthcare & Medical", "NGO & Non-profit", "Finance & Banking",
  "Education & Teaching", "Engineering & Construction", "Agriculture", "Logistics & Transport",
  "Sales & Marketing", "Human Resources", "Legal", "Hospitality & Tourism",
  "Mining & Energy", "Media & Communications", "Public Sector & Government",
  "Customer Service", "Manufacturing", "Telecommunications", "Retail",
  "Project Management", "Data & Analytics", "Security", "Real Estate",
  "Art & Design", "Research & Science", "Accounting", "Administration",
  "Supply Chain", "Consulting", "Executive Management"
];

async function main() {
  console.log("=== DAILY MASS SCRAPER START ===", new Date().toISOString());
  console.log("Target:", TARGET_JOBS_PER_COUNTRY, "jobs per country");

  for (const countryCode of COUNTRIES) {
    console.log(`\n--- Processing Country: ${countryCode} ---`);
    
    let jobsInsertedToday = 0;

    // First, always do a known-sources pass
    try {
      console.log(`[${countryCode}] Running known sources pass...`);
      const s = await runKnownSourcesForCountryProxy(countryCode, "daily-s-" + countryCode);
      jobsInsertedToday += s;
      console.log(`[${countryCode}] Known sources inserted: ${s}`);
    } catch(e) {
      console.error(`[${countryCode}] Error in known sources:`, e);
    }

    console.log(`[${countryCode}] Target: ${TARGET_JOBS_PER_COUNTRY} NEW jobs today.`);

    // Shuffle industries to get different queries each time
    const shuffledIndustries = [...INDUSTRIES].sort(() => Math.random() - 0.5);
    let industryIndex = 0;

    // Loop until we reach the target of NEW jobs, or run out of industries
    while (jobsInsertedToday < TARGET_JOBS_PER_COUNTRY && industryIndex < shuffledIndustries.length) {
      const industry = shuffledIndustries[industryIndex];
      industryIndex++;

      console.log(`\n[${countryCode}] Generating queries for industry: ${industry}`);
      const queries = [
        `"latest jobs" ${industry} ${countryCode} 2026`,
        `hiring ${industry} professionals ${countryCode}`,
        `vacancies ${industry} ${countryCode} apply`,
        `"job opening" ${industry} ${countryCode}`
      ];

      try {
        const q = await runQueriesForCountryProxy(queries, countryCode, `daily-q-${countryCode}-${industry}`);
        jobsInsertedToday += q;
        console.log(`[${countryCode}] Inserted ${q} jobs from ${industry} queries.`);
      } catch(e) {
        console.error(`[${countryCode}] Error in broad queries:`, e);
      }

      console.log(`[${countryCode}] Progress: ${jobsInsertedToday} / ${TARGET_JOBS_PER_COUNTRY} new jobs`);
      
      // Sleep a bit to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    if (jobsInsertedToday >= TARGET_JOBS_PER_COUNTRY) {
      console.log(`[${countryCode}] 🎉 Daily target reached! (${jobsInsertedToday} new jobs)`);
    } else {
      console.log(`[${countryCode}] ⚠️ Exhausted all industries. Final count today: ${jobsInsertedToday}`);
    }

  }

  console.log("\n=== DAILY MASS SCRAPER DONE ===", new Date().toISOString());
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
