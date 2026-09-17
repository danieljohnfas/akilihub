import 'dotenv/config';
import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { countries } from '../src/lib/db/schema/shared';
import { inArray } from 'drizzle-orm';

async function main() {
  console.log("Fetching DB countries...");
  const targetCountries = ["Kenya", "Tanzania", "Uganda", "Rwanda", "Ghana", "Nigeria", "Zambia", "South Africa", "Ethiopia"];
  const dbCountries = await db.select().from(countries).where(inArray(countries.name, targetCountries));
  
  const countryMap = new Map<string, string>();
  for (const c of dbCountries) {
    countryMap.set(c.name, c.id);
  }

  console.log("Fetching real jobs directly from United Nations (UNFPA) Oracle ATS...");
  const res = await fetch('https://estm.fa.em2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations,flexFieldsFacet.values&finder=findReqs;siteNumber=CX_2001,facetsList=LOCATIONS%3BWORK_LOCATIONS%3BWORKPLACE_TYPES%3BTITLES%3BCATEGORIES%3BORGANIZATIONS%3BPOSTING_DATES%3BFLEX_FIELDS,limit=200');
  
  const data = await res.json();
  const rawJobs = data?.items?.[0]?.requisitionList || [];

  if (rawJobs.length === 0) {
    console.log("No jobs found.");
    return;
  }

  console.log(`Found ${rawJobs.length} real UN jobs. Formatting for database...`);
  
  const insertBatch = [];
  for (const req of rawJobs) {
    const loc = req.PrimaryLocation || "";
    const title = req.Title || "";
    
    // Attempt to match one of our target countries
    let countryId = null;
    for (const [name, id] of countryMap.entries()) {
      if (loc.includes(name) || title.includes(name)) {
        countryId = id;
        break;
      }
    }
    
    // Only insert jobs that match our African country footprint
    if (!countryId) continue;

    insertBatch.push({
      title: req.Title,
      companyName: "United Nations (UNFPA)",
      description: req.ShortDescriptionStr || "Apply on the official UN career portal.",
      countryId: countryId,
      jobType: "contract" as any, // UN jobs are often contracts
      sourceUrl: `https://estm.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/job/${req.Id}`,
      employerUrl: "https://www.unfpa.org/jobs",
      postedDate: req.PostedDate ? new Date(req.PostedDate) : new Date(),
      deadline: req.PostingEndDate ? new Date(req.PostingEndDate) : null,
      isActive: true,
      sector: "NGO / Humanitarian",
      needsAiExtraction: false
    });
  }

  console.log(`Matched ${insertBatch.length} jobs to our target African countries. Inserting into Postgres...`);
  
  let insertedCount = 0;
  for (let i = 0; i < insertBatch.length; i += 50) {
    const chunk = insertBatch.slice(i, i + 50);
    try {
      const result = await db.insert(jobs).values(chunk).onConflictDoNothing().returning({ id: jobs.id });
      insertedCount += result.length;
    } catch (e: any) {
      console.error(`Batch insert error:`, e.message);
    }
  }

  console.log(`Successfully inserted ${insertedCount} real jobs from the UN!`);
}

main().catch(console.error).finally(() => process.exit(0));
