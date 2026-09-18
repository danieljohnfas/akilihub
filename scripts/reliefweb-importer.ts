import 'dotenv/config';
import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { countries } from '../src/lib/db/schema/shared';
import { inArray } from 'drizzle-orm';

async function main() {
  console.log("Fetching DB countries...");
  const targetCountries = ["Tanzania", "Kenya", "Uganda", "Rwanda", "Ghana", "Nigeria", "Zambia", "South Africa", "Ethiopia"];
  const dbCountries = await db.select().from(countries).where(inArray(countries.name, targetCountries));
  
  const countryMap = new Map<string, string>();
  for (const c of dbCountries) {
    countryMap.set(c.name, c.id);
  }

  // To fetch up to 2000 jobs PER COUNTRY, we will query ReliefWeb country by country.
  for (const countryName of targetCountries) {
    console.log(`\n=== Fetching jobs for ${countryName} from ReliefWeb ===`);
    const countryId = countryMap.get(countryName);
    if (!countryId) {
      console.log(`[!] Country ${countryName} not found in DB. Skipping.`);
      continue;
    }

    let offset = 0;
    const limit = 100; // Safe limit to avoid 403 on ReliefWeb
    let totalFetchedForCountry = 0;
    
    while (totalFetchedForCountry < 2000) {
      console.log(`[${countryName}] Fetching offset ${offset}...`);
      const baseUrl = `https://api.reliefweb.int/v2/jobs?appname=akilihub&limit=${limit}&offset=${offset}&preset=latest&profile=full`;
      const url = `${baseUrl}&filter[field]=country.name&filter[value]=${encodeURIComponent(countryName)}`;

      try {
        const res = await fetch("https://akilihub-scraper.onrender.com/proxy_api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: url,
            method: "GET"
          })
        });

        if (!res.ok) {
          console.error(`[!] ReliefWeb API Proxy failed for ${countryName}: ${res.status} ${res.statusText}`);
          break;
        }

        const rawData = await res.json();
        // The proxy returns { success: true, status_code: 200, data: ... }
        if (!rawData.success || !rawData.data) {
           console.log(`[${countryName}] No valid data returned from proxy. Error: ${rawData.error}`);
           break;
        }
        
        const data = typeof rawData.data === 'string' ? JSON.parse(rawData.data) : rawData.data;
        const items = data.data || [];
        
        if (items.length === 0) {
          console.log(`[${countryName}] No more jobs found on ReliefWeb at offset ${offset}.`);
          break; // Exhausted all jobs for this country
        }

        console.log(`[${countryName}] Found ${items.length} jobs at offset ${offset}. Formatting for database...`);
        
        const insertBatch = [];
        for (const item of items) {
          const fields = item.fields;
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

        // Insert in chunks of 50
        let insertedChunkCount = 0;
        for (let i = 0; i < insertBatch.length; i += 50) {
          const chunk = insertBatch.slice(i, i + 50);
          try {
            const result = await db.insert(jobs).values(chunk).onConflictDoNothing().returning({ id: jobs.id });
            insertedChunkCount += result.length;
          } catch (e: any) {
            console.error(`[${countryName}] Batch insert error:`, e.message);
          }
        }

        console.log(`[${countryName}] Inserted ${insertedChunkCount} NEW jobs (out of ${insertBatch.length} fetched in this batch).`);
        totalFetchedForCountry += items.length;
        offset += items.length;

        // If we fetched fewer than the limit, it means we've hit the end of the results.
        if (items.length < limit) {
           console.log(`[${countryName}] Reached the end of available ReliefWeb jobs.`);
           break;
        }

      } catch (err: any) {
        console.error(`[!] Fatal error for ${countryName} at offset ${offset}:`, err.message);
        break;
      }
    }
    
    console.log(`=== Finished ${countryName}: processed ${totalFetchedForCountry} total ReliefWeb jobs ===\n`);
  }
}

main().catch(console.error).finally(() => process.exit(0));
