import { config } from 'dotenv';
config({ path: '.env.vercel' });

const COUNTRIES = [
  'ke', // Kenya
  'tz', // Tanzania
  'ug', // Uganda
  'rw', // Rwanda
  'et', // Ethiopia
  'cd', // DRC
  'bi', // Burundi
  'so', // Somalia
  'ss'  // South Sudan
];

const MODULES = ['jobs', 'tenders', 'compliance', 'health'];

async function triggerMassScrape() {
  const { inngest } = await import('../src/inngest/client');
  console.log('🚀 Triggering Mass Scrape for all countries and modules...');
  const events: { name: string, data: any }[] = [];

  for (const country of COUNTRIES) {
    for (const module of MODULES) {
      events.push({
        name: `manual.scrape.${module}` as any,
        data: { countryCode: country, isMassScrape: true },
      });
    }
  }

  try {
    // Dispatch in batches of 20 to avoid payload limits
    const batchSize = 20;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      await inngest.send(batch);
      console.log(`✅ Dispatched batch ${i / batchSize + 1} (${batch.length} events)`);
      await new Promise(r => setTimeout(r, 500)); // Rate limit
    }
    
    console.log(`\n🎉 Mass Scrape Triggered Successfully! (${events.length} total events)`);
    console.log(`\nThe pipelines will first scrape from known 'clean' sources (employer pages/authorities) before falling back to Serper/DuckDuckGo.`);
    
    // After mass scrape triggers, also trigger the manual data review (enrichment)
    console.log(`\nTriggering data review (enrichment & url resolution)...`);
    await inngest.send([
      { name: 'manual.data.review', data: {} } as any
    ]);
    console.log(`✅ Manual Data Review dispatched.`);

  } catch (error) {
    console.error('❌ Failed to trigger mass scrape:', error);
  }
}

triggerMassScrape().catch(console.error);
