import { db } from '../../db/client';
import { countries } from '../../db/schema/shared';
import { inArray } from 'drizzle-orm';
import { fetchAtsApi } from '../../sources/ats-fetcher';

export async function fetchSmartRecruitersJobs(config: any) {
  try {
    const targetCountries = ["Kenya", "Tanzania", "Uganda", "Rwanda", "Ghana", "Nigeria", "Zambia", "South Africa", "Ethiopia"];
    const dbCountries = await db.select().from(countries).where(inArray(countries.name, targetCountries));
    
    const countryMap = new Map<string, string>(); // 'ke' -> id
    for (const c of dbCountries) {
      const code = c.name === "Kenya" ? "ke" :
                   c.name === "Tanzania" ? "tz" :
                   c.name === "Uganda" ? "ug" :
                   c.name === "Rwanda" ? "rw" :
                   c.name === "Ghana" ? "gh" :
                   c.name === "Nigeria" ? "ng" :
                   c.name === "Zambia" ? "zm" :
                   c.name === "South Africa" ? "za" :
                   c.name === "Ethiopia" ? "et" : "";
      if (code) countryMap.set(code, c.id);
    }

    const endpoint = `https://api.smartrecruiters.com/v1/companies/${config.companyId}/postings`;
    const data = await fetchAtsApi(endpoint);
    const jobsList = data?.content || [];
    
    if (jobsList.length === 0) return [];

    const parsedJobs = [];
    for (const req of jobsList) {
      let countryId = null;
      
      const locCountry = (req.location?.country || "").toLowerCase();
      if (countryMap.has(locCountry)) {
          countryId = countryMap.get(locCountry);
      }

      if (!countryId) continue; 

      parsedJobs.push({
        title: req.name,
        companyName: config.companyName,
        // SmartRecruiters list endpoint doesn't return full description, but it gives enough to route the user
        description: `Role based in ${req.location?.city || locCountry.toUpperCase()}. View full description and requirements on the company portal.`,
        countryId: countryId,
        jobType: "full_time",
        sourceUrl: `https://jobs.smartrecruiters.com/${config.companyId}/${req.id}`,
        employerUrl: config.employerUrl,
        postedDate: req.releasedDate ? new Date(req.releasedDate) : new Date(),
        deadline: null,
        isActive: true,
        sector: config.sector,
        needsAiExtraction: false
      });
    }

    return parsedJobs;
  } catch (error) {
    console.error(`[SmartRecruiters Handler] Error fetching jobs for ${config.companyName}:`, error);
    return [];
  }
}
