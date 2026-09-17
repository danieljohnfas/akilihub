import { db } from '../../db/client';
import { countries } from '../../db/schema/shared';
import { inArray } from 'drizzle-orm';

import { fetchAtsApi } from '../../sources/ats-fetcher';

export async function fetchOracleJobs(config: any) {
  try {
    const targetCountries = ["Kenya", "Tanzania", "Uganda", "Rwanda", "Ghana", "Nigeria", "Zambia", "South Africa", "Ethiopia"];
    const dbCountries = await db.select().from(countries).where(inArray(countries.name, targetCountries));
    
    const countryMap = new Map<string, string>();
    for (const c of dbCountries) {
      let code = "UNKNOWN";
      if (c.name === "Kenya") code = "KE";
      if (c.name === "Tanzania") code = "TZ";
      if (c.name === "Uganda") code = "UG";
      if (c.name === "Rwanda") code = "RW";
      if (c.name === "South Africa") code = "ZA";
      
      countryMap.set(code, c.id);
      countryMap.set(c.name, c.id);
    }

    const data = await fetchAtsApi(config.endpoint);
    const rawJobs = data?.items?.[0]?.requisitionList || [];
    
    if (rawJobs.length === 0) return [];

    const parsedJobs = [];
    for (const req of rawJobs) {
      const countryCode = req.PrimaryLocationCountry;
      const loc = req.PrimaryLocation || "";
      const title = req.Title || "";
      
      let countryId = countryMap.get(countryCode);
      if (!countryId) {
        for (const [name, id] of countryMap.entries()) {
          if (loc.includes(name) || title.includes(name)) {
            countryId = id;
            break;
          }
        }
      }
      
      if (!countryId) continue; // Only process our target footprint

      // Construct dynamic URL from endpoint domain
      const url = new URL(config.endpoint);
      const host = url.origin;
      const siteNumberMatch = config.endpoint.match(/siteNumber=([^,]+)/);
      const siteNumber = siteNumberMatch ? siteNumberMatch[1] : 'CX_3001';

      parsedJobs.push({
        title: req.Title,
        companyName: config.companyName,
        description: req.ShortDescriptionStr || "No description provided.",
        countryId: countryId,
        jobType: "full_time", // Default
        sourceUrl: `${host}/hcmUI/CandidateExperience/en/sites/${siteNumber}/job/${req.Id}`,
        employerUrl: config.employerUrl,
        postedDate: req.PostedDate ? new Date(req.PostedDate) : new Date(),
        deadline: req.PostingEndDate ? new Date(req.PostingEndDate) : null,
        isActive: true,
        sector: config.sector,
        needsAiExtraction: false
      });
    }

    return parsedJobs;
  } catch (error) {
    console.error(`[Oracle Handler] Error fetching jobs for ${config.companyName}:`, error);
    return [];
  }
}
