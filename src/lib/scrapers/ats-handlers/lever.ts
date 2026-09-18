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

    const accountName = config.accountName || config.boardToken;
    const companyName = config.companyName || config.company;
    const employerUrl = config.employerUrl || `https://jobs.lever.co/${accountName}`;

    const endpoint = `https://api.lever.co/v0/postings/${accountName}?mode=json`;
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

      const fallbackCountryCode = config.defaultCountryCode || (config.country ? config.country.substring(0,2).toUpperCase() : null);

      // If location doesn't specifically match
      if (!countryId && fallbackCountryCode) {
        const defaultMap: Record<string, string> = { 
          "ZA": "south africa", "KE": "kenya", "TZ": "tanzania", "TA": "tanzania",
          "UG": "uganda", "RW": "rwanda", "NG": "nigeria", "GH": "ghana", "ZM": "zambia", "ET": "ethiopia" 
        };
        const defaultName = defaultMap[fallbackCountryCode] || (config.country ? config.country.toLowerCase() : null);
        if (defaultName && (loc.includes(defaultName) || loc.includes('remote') || loc.includes('anywhere'))) {
           countryId = countryMap.get(defaultName) || null;
        }
      }
      
      if (!countryId && config.country) {
          countryId = countryMap.get(config.country.toLowerCase()) || null;
      }

      if (!countryId) continue; 

      parsedJobs.push({
        title: req.text,
        companyName: companyName,
        description: req.descriptionPlain || req.description,
        countryId: countryId,
        jobType: "full_time",
        sourceUrl: req.hostedUrl,
        employerUrl: employerUrl,
        postedDate: req.createdAt ? new Date(req.createdAt) : new Date(),
        deadline: null,
        isActive: true,
        needsAiExtraction: false
      });
    }

    return parsedJobs;
  } catch (error) {
    console.error(`[Lever Handler] Error fetching jobs for ${config.companyName}:`, error);
    return [];
  }
}
