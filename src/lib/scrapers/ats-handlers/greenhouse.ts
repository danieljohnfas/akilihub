import { db } from '../../db/client';
import { countries } from '../../db/schema/shared';
import { inArray } from 'drizzle-orm';
import { fetchAtsApi } from '../../sources/ats-fetcher';

export async function fetchGreenhouseJobs(config: any) {
  try {
    const targetCountries = ["Kenya", "Tanzania", "Uganda", "Rwanda", "Ghana", "Nigeria", "Zambia", "South Africa", "Ethiopia"];
    const dbCountries = await db.select().from(countries).where(inArray(countries.name, targetCountries));
    
    const countryMap = new Map<string, string>();
    for (const c of dbCountries) {
      countryMap.set(c.name.toLowerCase(), c.id);
    }

    const endpoint = `https://boards-api.greenhouse.io/v1/boards/${config.boardToken}/jobs?content=true`;
    const data = await fetchAtsApi(endpoint);
    const jobsList = data?.jobs || [];
    
    if (jobsList.length === 0) return [];

    const companyName = config.companyName || config.company;
    const employerUrl = config.employerUrl || `https://boards.greenhouse.io/${config.boardToken}`;

    const parsedJobs = [];
    for (const req of jobsList) {
      let countryId = null;
      
      const loc = (req.location?.name || "").toLowerCase();
      
      for (const [name, id] of countryMap.entries()) {
        if (loc.includes(name)) {
          countryId = id;
          break;
        }
      }

      const fallbackCountryCode = config.defaultCountryCode || (config.country ? config.country.substring(0,2).toUpperCase() : null);

      // If location doesn't specifically match but company operates strictly in default country
      if (!countryId && fallbackCountryCode) {
        const defaultMap: Record<string, string> = { 
          "ZA": "south africa", "KE": "kenya", "TZ": "tanzania", "TA": "tanzania",
          "UG": "uganda", "RW": "rwanda", "NG": "nigeria", "GH": "ghana", "ZM": "zambia", "ET": "ethiopia" 
        };
        const defaultName = defaultMap[fallbackCountryCode] || (config.country ? config.country.toLowerCase() : null);
        if (defaultName && loc.includes(defaultName)) {
           countryId = countryMap.get(defaultName) || null;
        }
        // If it says "Remote" and they are an African company, assign to default
        if (!countryId && (loc.includes('remote') || loc.includes('anywhere'))) {
            countryId = countryMap.get(defaultName) || null;
        }
      }
      
      // Final fallback to the country if explicitly defined in config
      if (!countryId && config.country) {
          countryId = countryMap.get(config.country.toLowerCase()) || null;
      }

      if (!countryId) continue; // Skip jobs not in our 9 target countries

      parsedJobs.push({
        title: req.title,
        companyName: companyName,
        // Greenhouse returns raw HTML in content, but for DB we can keep it or strip it.
        // We will store the HTML in description, frontend can render it safely.
        description: req.content ? req.content.substring(0, 5000) : "View full description on company portal.",
        countryId: countryId,
        jobType: "full_time", // Default
        sourceUrl: req.absolute_url,
        employerUrl: employerUrl,
        postedDate: req.updated_at ? new Date(req.updated_at) : new Date(),
        deadline: null,
        isActive: true,
        sector: config.sector,
        needsAiExtraction: false
      });
    }

    return parsedJobs;
  } catch (error) {
    console.error(`[Greenhouse Handler] Error fetching jobs for ${config.companyName}:`, error);
    return [];
  }
}
