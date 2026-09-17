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
    // Workday often uses country names in 'locationsText'
  }

  const workdayTenants = [
    { name: "Absa Bank", url: "https://absa.wd3.myworkdayjobs.com/wday/cxs/absa/AbsaCareers/jobs", siteUrl: "https://absa.wd3.myworkdayjobs.com/AbsaCareers" },
    { name: "Safaricom", url: "https://safaricom.wd3.myworkdayjobs.com/wday/cxs/safaricom/Safaricom_Careers/jobs", siteUrl: "https://safaricom.wd3.myworkdayjobs.com/Safaricom_Careers" }
  ];

  let allJobs = [];

  for (const tenant of workdayTenants) {
    console.log(`Fetching jobs from ${tenant.name} Workday API...`);
    try {
      const res = await fetch(tenant.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        body: JSON.stringify({ appliedFacets: {}, limit: 100, offset: 0, searchText: "" })
      });
      
      if (!res.ok) {
        console.log(`Failed to fetch ${tenant.name}: ${res.status}`);
        continue;
      }
      
      const data = await res.json();
      const postings = data.jobPostings || [];
      console.log(`Found ${postings.length} jobs for ${tenant.name}.`);

      for (const req of postings) {
        let countryId = countryMap.get("South Africa"); // Default ZA for Absa
        if (tenant.name === "Safaricom") countryId = countryMap.get("Kenya");
        
        // Try to match location text
        const loc = req.locationsText || "";
        for (const [name, id] of countryMap.entries()) {
          if (loc.includes(name)) countryId = id;
        }

        if (!countryId) continue;

        allJobs.push({
          title: req.title,
          companyName: tenant.name,
          description: req.bulletFields?.join("\n") || "View full job description on company portal.",
          countryId: countryId,
          jobType: req.timeType?.includes("Part") ? "part_time" : "full_time" as any,
          sourceUrl: `${tenant.siteUrl}${req.externalPath}`,
          employerUrl: tenant.siteUrl,
          postedDate: req.postedOn ? new Date(req.postedOn) : new Date(),
          deadline: null,
          isActive: true,
          sector: "Banking & Tech",
          needsAiExtraction: false
        });
      }
    } catch (e) {
      console.error(`Error with ${tenant.name}:`, e);
    }
  }

  console.log(`Inserting ${allJobs.length} jobs into Postgres...`);
  
  let insertedCount = 0;
  for (let i = 0; i < allJobs.length; i += 50) {
    const chunk = allJobs.slice(i, i + 50);
    try {
      const result = await db.insert(jobs).values(chunk).onConflictDoNothing().returning({ id: jobs.id });
      insertedCount += result.length;
    } catch (e: any) {
      console.error(`Batch insert error:`, e.message);
    }
  }

  console.log(`Successfully inserted ${insertedCount} real jobs from Workday!`);
}

main().catch(console.error).finally(() => process.exit(0));
