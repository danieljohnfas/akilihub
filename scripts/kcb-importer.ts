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
    // Map ISO codes back to IDs since Oracle gives us country codes (e.g. KE)
    let code = "UNKNOWN";
    if (c.name === "Kenya") code = "KE";
    if (c.name === "Tanzania") code = "TZ";
    if (c.name === "Uganda") code = "UG";
    if (c.name === "Rwanda") code = "RW";
    if (c.name === "South Africa") code = "ZA";
    
    countryMap.set(code, c.id);
    countryMap.set(c.name, c.id);
  }

  console.log("Fetching real jobs directly from KCB Group's Oracle HCM ATS...");
  const res = await fetch('https://eoin.fa.em3.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations,flexFieldsFacet.values&finder=findReqs;siteNumber=CX_3001,facetsList=LOCATIONS%3BWORK_LOCATIONS%3BWORKPLACE_TYPES%3BTITLES%3BCATEGORIES%3BORGANIZATIONS%3BPOSTING_DATES%3BFLEX_FIELDS,limit=100');
  
  const data = await res.json();
  const rawJobs = data?.items?.[0]?.requisitionList || [];

  if (rawJobs.length === 0) {
    console.log("No jobs found.");
    return;
  }

  console.log(`Found ${rawJobs.length} real KCB jobs. Formatting for database...`);
  
  const insertBatch = [];
  for (const req of rawJobs) {
    const countryCode = req.PrimaryLocationCountry;
    const countryId = countryMap.get(countryCode) || countryMap.get("KE"); // Default to Kenya for KCB if missing
    
    if (!countryId) continue;

    insertBatch.push({
      title: req.Title,
      companyName: "KCB Group",
      description: req.ShortDescriptionStr || "No description provided.",
      countryId: countryId,
      jobType: "full_time" as any, // Oracle HCM often hides this in complex fields, default to FT
      sourceUrl: `https://eoin.fa.em3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_3001/job/${req.Id}`,
      employerUrl: "https://kcbgroup.com/careers",
      postedDate: req.PostedDate ? new Date(req.PostedDate) : new Date(),
      deadline: req.PostingEndDate ? new Date(req.PostingEndDate) : null,
      isActive: true,
      sector: "Banking & Finance",
      needsAiExtraction: false
    });
  }

  console.log(`Inserting ${insertBatch.length} jobs into Postgres...`);
  
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

  console.log(`Successfully inserted ${insertedCount} real jobs from KCB Group!`);
}

main().catch(console.error).finally(() => process.exit(0));
