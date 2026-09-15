import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { generateObjectWithFallback } from '../src/lib/ai/router';
import { searchGoogle } from '../src/lib/scrapers/broad-search-engine';

const REGISTRY_PATH = path.join(process.cwd(), 'src/lib/sources/discovered-careers.json');

async function loadRegistry() {
  try {
    const data = await fs.readFile(REGISTRY_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveRegistry(registry: any) {
  await fs.readFile(REGISTRY_PATH, 'utf-8').catch(() => null); // dummy
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

async function discoverCompanies(topic: string, country: string) {
  console.log(`\n[Discovery] Finding companies for: ${topic} in ${country}`);
  
  const object = await generateObjectWithFallback({
    prompt: `List 30 major ${topic} operating in ${country}. Return only their official names. Focus on large employers.`,
    schema: z.object({
      companies: z.array(z.string().describe("Official name of the company or organization"))
    })
  });
  
  return object.object.companies;
}

async function findCareerPage(company: string, country: string) {
  const query = `"${company}" ${country} "careers" OR "vacancies" OR "jobs" -site:linkedin.com -site:facebook.com`;
  console.log(`[Discovery] Searching career page for: ${company}...`);
  const urls = await searchGoogle(query, 3);
  
  if (urls.length === 0) return null;
  
  const object = await generateObjectWithFallback({
    prompt: `Look at this URL: ${urls[0]}. Is this likely the OFFICIAL career or jobs page for the company "${company}" in ${country}? Reply true only if it's the direct employer's site (not a news article or aggregator).`,
    schema: z.object({
      isOfficialCareerPage: z.boolean(),
      cleanUrl: z.string().describe("The clean base URL to the career page if true")
    })
  });
  
  if (object.object.isOfficialCareerPage) {
    return object.object.cleanUrl;
  }
  return null;
}

async function run() {
  const registry = await loadRegistry();
  const existingCompanies = new Set(registry.map((r: any) => r.company));
  
  const topics = ['Banks', 'NGOs', 'Hospitals', 'Universities', 'Manufacturing Companies', 'Telecommunications'];
  const countries = ['Tanzania', 'Kenya', 'Uganda', 'Rwanda', 'Ghana', 'Nigeria', 'Zambia', 'South Africa', 'Ethiopia'];
  
  while (true) {
    let madeProgress = false;
    for (const country of countries) {
      for (const topic of topics) {
        try {
          const companies = await discoverCompanies(topic, country);
          
          for (const company of companies) {
            if (existingCompanies.has(company)) continue;
            
            const careerUrl = await findCareerPage(company, country);
            if (careerUrl) {
              console.log(`[Success] Found career page: ${company} -> ${careerUrl}`);
              registry.push({ company, country, sector: topic, url: careerUrl });
              await saveRegistry(registry);
              existingCompanies.add(company);
              madeProgress = true;
            } else {
              console.log(`[Failed] Could not find valid career page for ${company} (Search APIs might be exhausted).`);
            }
            
            // Sleep to avoid rate limits
            await new Promise(r => setTimeout(r, 5000));
          }
        } catch (err) {
          console.error(`[Error] Topic loop failed:`, (err as Error).message);
          // If a topic loop fails due to an exhausted AI, wait 5 minutes before continuing
          console.log('[Daemon] Sleeping for 5 minutes due to API exhaustion...');
          await new Promise(r => setTimeout(r, 300000));
        }
      }
    }
    console.log('[Daemon] Completed a full sweep of all countries and topics.');
    
    // If running in GitHub Actions, exit after one full sweep
    if (process.env.CI) {
      console.log('[Daemon] CI environment detected. Exiting after one sweep.');
      break;
    }

    if (!madeProgress) {
       console.log('[Daemon] No new companies found. Sleeping for 30 minutes to wait for quotas to reset...');
       await new Promise(r => setTimeout(r, 1800000));
    }
  }
}

run().catch(console.error);
