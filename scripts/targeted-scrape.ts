import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { extractJobsWithAI } from '../src/lib/scrapers/broad-search-engine';
import { fetchHtml, htmlToTextEnriched } from '../src/lib/scrapers/compliance-base';
import { saveJobs } from '../src/inngest/scrape-jobs';

const REGISTRY_PATH = path.join(process.cwd(), 'src/lib/sources/discovered-careers.json');

async function withUrlTimeout<T>(promiseFn: () => Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`[timeout] ${label} exceeded ${ms}ms`)), ms);
    promiseFn().then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

const COUNTRY_CODES: Record<string, string> = {
  'Tanzania': 'TZ',
  'Kenya': 'KE',
  'Uganda': 'UG',
  'Rwanda': 'RW',
  'Ghana': 'GH',
  'Nigeria': 'NG',
  'Zambia': 'ZM',
  'South Africa': 'ZA',
  'Ethiopia': 'ET'
};

async function run() {
  let registry: any[] = [];
  try {
    const data = await fs.readFile(REGISTRY_PATH, 'utf-8');
    registry = JSON.parse(data);
  } catch {
    console.error(`[Targeted Scraper] Registry not found at ${REGISTRY_PATH}. Is the discovery daemon running?`);
    process.exit(1);
  }

  console.log(`[Targeted Scraper] Found ${registry.length} registered career pages. Beginning crawl...`);

  const CONCURRENT = 2; 

  for (let i = 0; i < registry.length; i += CONCURRENT) {
    const batch = registry.slice(i, i + CONCURRENT);

    const results = await Promise.allSettled(
      batch.map(async (entry) => {
        const { company, country, url } = entry;
        console.log(`[Targeted Scraper] Crawling ${company} (${country}): ${url}`);
        
        return withUrlTimeout(async () => {
          const html = await fetchHtml(url);
          if (!html) return { entry, jobs: [] };
          const { text } = await htmlToTextEnriched(html, url);
          const jobs = await extractJobsWithAI(text, url, html);
          return { entry, jobs };
        }, 45_000, url);
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.jobs.length > 0) {
        const { entry, jobs } = result.value;
        const countryCode = COUNTRY_CODES[entry.country] || 'TZ';
        
        try {
          const inserted = await saveJobs(jobs, countryCode);
          console.log(`[Targeted Scraper] \u2714 Inserted ${inserted} jobs from ${entry.company}`);
        } catch (e: any) {
          console.error(`[Targeted Scraper] Database insert failed for ${entry.company}:`, e.message);
        }
      } else if (result.status === 'rejected') {
        console.warn(`[Targeted Scraper] \u2716 A URL in the batch failed: ${result.reason?.message}`);
      }
    }
  }
  
  console.log(`[Targeted Scraper] Crawl complete!`);
}

run().catch(console.error).finally(() => process.exit(0));
