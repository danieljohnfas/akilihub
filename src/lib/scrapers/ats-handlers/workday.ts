import { db } from '../../db/client';
import { countries } from '../../db/schema/shared';
import { inArray } from 'drizzle-orm';

import { fetchAtsApi } from '../../sources/ats-fetcher';

export async function fetchWorkdayJobs(config: any) {
  try {
    const targetCountries = ["Kenya", "Tanzania", "Uganda", "Rwanda", "Ghana", "Nigeria", "Zambia", "South Africa", "Ethiopia"];
    const dbCountries = await db.select().from(countries).where(inArray(countries.name, targetCountries));
    
    const countryMap = new Map<string, string>();
    for (const c of dbCountries) {
      countryMap.set(c.name, c.id);
    }

    const data = await fetchAtsApi(
      config.endpoint,
      "POST",
      {
        "Accept": "application/json"
      },
      { appliedFacets: {}, limit: 100, offset: 0, searchText: "" }
    );
    const postings = data.jobPostings || [];
    if (postings.length === 0) return [];

    const parsedJobs = [];
    for (const req of postings) {
      let countryId = null;
      
      const loc = req.locationsText || "";
      for (const [name, id] of countryMap.entries()) {
        if (loc.includes(name)) {
          countryId = id;
          break;
        }
      }

      if (!countryId && config.defaultCountryCode) {
         // Fallback to default
         const defaultMap: Record<string, string> = { "ZA": "South Africa", "KE": "Kenya", "TZ": "Tanzania", "UG": "Uganda", "RW": "Rwanda" };
         const defaultName = defaultMap[config.defaultCountryCode];
         if (defaultName) countryId = countryMap.get(defaultName) || null;
      }

      if (!countryId) continue;

      parsedJobs.push({
        title: req.title,
        companyName: config.companyName,
        description: req.bulletFields?.join("\n") || "View full job description on company portal.",
        countryId: countryId,
        jobType: req.timeType?.includes("Part") ? "part_time" : "full_time",
        sourceUrl: `${config.siteUrl}${req.externalPath}`,
        employerUrl: config.employerUrl,
        postedDate: req.postedOn ? new Date(req.postedOn) : new Date(),
        deadline: null,
        isActive: true,
        sector: config.sector,
        needsAiExtraction: false
      });
    }

    return parsedJobs;
  } catch (error) {
    console.error(`[Workday Handler] Error fetching jobs for ${config.companyName}:`, error);
    return [];
  }
}
