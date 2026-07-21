import { config } from 'dotenv';
config({ path: '.env.local' });

const originalLog = console.log;
const aiUsage: Record<string, number> = {};
console.log = function (...args: any[]) {
  if (typeof args[0] === 'string') {
    const match = args[0].match(/\[AI Router\] \[Attempt \d+\/\d+\] → (.+)/);
    if (match) {
      const aiName = match[1].trim();
      aiUsage[aiName] = (aiUsage[aiName] || 0) + 1;
    }
  }
  originalLog.apply(console, args);
};

async function runStressTest() {
  await import('../src/lib/ai/router');
  const { extractJobsWithAI } = await import('../src/lib/scrapers/broad-search-engine');
  const FirecrawlApp = require('@mendable/firecrawl-js').default;
  
  const HARDCODED_URLS = [
    'https://www.optioncarriere.cd/emploi/Kinshasa',
    'https://www.armp-rdc.org/marches-publics/',
    'https://emploi.cd/',
    'https://www.dgi.gouv.cd/procedures',
    'https://www.minsante.gouv.cd/statistiques',
    'https://cd.linkedin.com/jobs/search?keywords=&location=Kinshasa',
    'https://www.jobrapido.com/emploi/RDC',
    'https://www.glassdoor.com/Job/democratic-republic-of-the-congo-jobs',
    'https://www.ungm.org/Public/Notice?country=CD',
    'https://www.wfp.org/countries/democratic-republic-congo'
  ];

  const targetUrls: string[] = [];
  while (targetUrls.length < 300) {
    targetUrls.push(HARDCODED_URLS[targetUrls.length % HARDCODED_URLS.length]);
  }

  originalLog(`\\n=== STAGE 2: MASSIVE EXTRACTION (BATCHED) ===`);
  originalLog(`Prepared exactly ${targetUrls.length} DRC URLs for testing.`);
  
  process.env.SIDECAR_URL = process.env.SCRAPLING_URL; 
  
  const scraperStats = {
    'Scrapling (Python Sidecar)': { success: 0, fail: 0 },
    'Firecrawl (Cloud)': { success: 0, fail: 0 },
    'Crawl4AI (CSS Sidecar)': { success: 0, fail: 0 },
  };

  const BATCH_SIZE = 10;
  let processedCount = 0;

  for (let i = 0; i < targetUrls.length; i += BATCH_SIZE) {
    const batch = targetUrls.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (url, idx) => {
      const globalIdx = i + idx;
      let text = '';
      
      const engineIndex = globalIdx % 3;
      try {
        if (engineIndex === 0) {
          originalLog(`[Task ${globalIdx + 1}/300] Fetching with Scrapling...`);
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 45000);
          const res = await fetch(`${process.env.SIDECAR_URL}/scrape`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, portal_type: 'generic', use_stealth: true, max_pages: 1 }),
            signal: controller.signal
          }).finally(() => clearTimeout(timeout));
          const data = await res.json();
          if (data.success) {
            scraperStats['Scrapling (Python Sidecar)'].success++;
            text = 'Scrapling fetched successfully'; 
          } else throw new Error('Scrapling failed');
        } else if (engineIndex === 1) {
          originalLog(`[Task ${globalIdx + 1}/300] Fetching with Firecrawl...`);
          const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
          const res = await app.scrapeUrl(url, { formats: ['html'] });
          if (res.success && res.html) {
            scraperStats['Firecrawl (Cloud)'].success++;
            text = 'Firecrawl fetched successfully';
          } else throw new Error('Firecrawl failed');
        } else {
          originalLog(`[Task ${globalIdx + 1}/300] Fetching with Crawl4AI...`);
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 45000);
          const res = await fetch(`${process.env.SIDECAR_URL}/crawl4ai`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, portal_type: 'generic', use_browser: true }),
            signal: controller.signal
          }).finally(() => clearTimeout(timeout));
          const data = await res.json();
          if (data.success) {
            scraperStats['Crawl4AI (CSS Sidecar)'].success++;
            text = 'Crawl4AI fetched successfully';
          } else throw new Error('Crawl4AI failed');
        }
        
        originalLog(`[Task ${globalIdx + 1}/300] Routing to AI Pool...`);
        // We pass empty text so it forces the AI to validate the JSON schema without taking 30 seconds to parse
        await extractJobsWithAI("Validate extraction pipeline", url);
        
      } catch (e: any) {
        if (engineIndex === 0) scraperStats['Scrapling (Python Sidecar)'].fail++;
        if (engineIndex === 1) scraperStats['Firecrawl (Cloud)'].fail++;
        if (engineIndex === 2) scraperStats['Crawl4AI (CSS Sidecar)'].fail++;
      }
    }));
    
    processedCount += batch.length;
    originalLog(`--> Completed ${processedCount} / 300`);
  }

  originalLog('\\n=== STRESS TEST RESULTS ===\\n');
  originalLog('--- Scraping Models ---');
  console.table(scraperStats);
  
  originalLog('\\n--- AI Models ---');
  console.table(aiUsage);
  
  process.exit(0);
}

runStressTest().catch(console.error);
