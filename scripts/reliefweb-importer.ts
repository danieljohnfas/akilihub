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

  console.log("Fetching latest jobs from ReliefWeb API (v2)...");
  
  // Construct GET URL with query parameters
  const baseUrl = "https://api.reliefweb.int/v2/jobs?appname=akilihub&limit=100&preset=latest&profile=full";
  const filterParams = targetCountries.map(c => `&filter[value][]=${encodeURIComponent(c)}`).join("");
  const url = `${baseUrl}&filter[field]=country.name${filterParams}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { 
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });

  if (!res.ok) {
    throw new Error(`ReliefWeb API failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.data || data.data.length === 0) {
    console.log("No jobs found on ReliefWeb.");
    return;
  }

  console.log(`Found ${data.data.length} jobs. Formatting for database...`);
  
  const insertBatch = [];
  for (const item of data.data) {
    const fields = item.fields;
    
    const countryName = fields["country"]?.[0]?.name;
    const countryId = countryName ? countryMap.get(countryName) : undefined;
    if (!countryId) continue; 

    const rwType = fields["type"]?.[0]?.name?.toLowerCase() || "";
    let jobType = "full_time";
    if (rwType.includes("consult")) jobType = "contract";
    if (rwType.includes("intern")) jobType = "internship";
    if (rwType.includes("part")) jobType = "part_time";

    insertBatch.push({
      title: fields.title,
      companyName: fields["source"]?.[0]?.name || "Unknown NGO",
      description: fields.body || "No description provided.",
      countryId: countryId,
      jobType: jobType as any,
      sourceUrl: fields.url || fields.url_alias || `https://reliefweb.int/job/${item.id}`,
      employerUrl: fields.url || fields.url_alias || `https://reliefweb.int/job/${item.id}`,
      postedDate: fields["date"]?.created ? new Date(fields["date"].created) : new Date(),
      deadline: fields["date"]?.closing ? new Date(fields["date"].closing) : null,
      isActive: true,
      sector: "NGO / Humanitarian",
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

  console.log(`Successfully inserted ${insertedCount} new jobs!`);
}

main().catch(console.error).finally(() => process.exit(0));
