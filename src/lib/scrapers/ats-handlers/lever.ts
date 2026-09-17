import { db } from '../../db/client';
import { countries } from '../../db/schema/shared';
import { inArray } from 'drizzle-orm';
import { fetchAtsApi } from '../../sources/ats-fetcher';

export async function fetchLeverJobs(config: any) {
  try {
    const targetCountries = ["Kenya", "Tanzania", "Uganda", "Rwanda", "Ghana", "Nigeria", "Zambia", "South Africa", "Ethiopia"];
    const dbCountries = await db.select().from(countries).where(inArray(countries.name, targetCountries));
    
    const countryMap = new Map<string, string>();
    for (const c of dbCountries) {
      countryMap.set(c.name.toLowerCase(), c.id);
    }

    const endpoint = `https://api.lever.co/v0/postings/${config.accountName}?mode=json`;
    const data = await fetchAtsApi(endpoint);
    // Lever returns an array of postings directly
    const jobsList = Array.isArray(data) ? data : [];
    
    if (jobsList.length === 0) return [];

    const parsedJobs = [];
    for (const req of jobsList) {
      let countryId = null;
      
      const loc = (req.categories?.location || "").toLowerCase();
      
      for (const [name, id] of countryMap.entries()) {
        if (loc.includes(name)) {
          countryId = id;
          break;
        }
      }

      // If location doesn't specifically match
      if (!countryId && config.defaultCountryCode) {
        const defaultMap: Record<string, string> = { 
          "ZA": "south africa", "KE": "kenya", "TZ": "tanzania", 
          "UG": "uganda", "RW": "rwanda", "NG": "nigeria", "GH": "ghana", "ZM": "zambia", "ET": "ethiopia" 
        };
        const defaultName = defaultMap[config.defaultCountryCode];
        if (defaultName && (loc.includes(defaultName) || loc.includes('remote') || loc.includes('anywhere'))) {
           countryId = countryMap.get(defaultName) || null;
        }
      }

      if (!countryId) continue; 

      parsedJobs.push({
        title: req.text,
        companyName: config.companyName,
        description: req.descriptionPlain ? req.descriptionPlain.substring(0, 5000) : "View full description on company portal.",
        countryId: countryId,
        jobType: req.categories?.commitment === "Part time" ? "part_time" : "full_time",
        sourceUrl: req.hostedUrl,
        employerUrl: config.employerUrl,
        postedDate: req.createdAt ? new Date(req.createdAt) : new Date(),
        deadline: null,
        isActive: true,
        sector: config.sector,
        needsAiExtraction: false
      });
    }

    return parsedJobs;
  } catch (error) {
    console.error(`[Lever Handler] Error fetching jobs for ${config.companyName}:`, error);
    return [];
  }
}
