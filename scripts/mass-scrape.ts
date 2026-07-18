import { config } from '@dotenvx/dotenvx';
config({ path: '.env.local', quiet: true });

import { db } from '../src/lib/db/client';
import { countries } from '../src/lib/db/schema/shared';
import { jobs } from '../src/lib/db/schema/jobs';
import { tenders } from '../src/lib/db/schema/tenders';
import { complianceRequirements } from '../src/lib/db/schema/compliance';
import { searchGoogle } from '../src/lib/scrapers/broad-search-engine';
import { extractJobsWithAI } from '../src/lib/scrapers/broad-search-engine';
import { extractTendersWithAI } from '../src/lib/scrapers/broad-search-engine-tenders';
import { extractResourcesWithAI, htmlToText, fetchHtml } from '../src/lib/scrapers/compliance-base';
import { eq } from 'drizzle-orm';

const TARGET_PAGES = 200;
const CONCURRENCY = 5; // Matches the 5 active AI models

async function processInBatches<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

async function runMassScrape() {
  console.log('🚀 Starting Mass Scraping Task 🚀');
  
  // Retry the initial DB fetch — Supabase's PgBouncer can timeout briefly
  // after previous connections are released. 3 attempts with 5s backoff.
  let allCountries: typeof import('../src/lib/db/schema/shared').countries.$inferSelect[] = [];
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      allCountries = await db.select().from(countries);
      break;
    } catch (e: any) {
      console.warn(`[DB] Countries fetch attempt ${attempt} failed: ${e.message}`);
      if (attempt === 3) throw e;
      await new Promise(r => setTimeout(r, 5000 * attempt));
    }
  }

  console.log(`Found ${allCountries.length} countries.`);

  for (const country of allCountries) {
    console.log(`\n==============================================`);
    console.log(`🌍 Processing Country: ${country.name}`);
    console.log(`==============================================\n`);

    // --- 1. JOBS ---
    console.log(`\n[JOBS] Fetching URLs for ${country.name}...`);
    const jobQueries = [
      `latest job vacancies in ${country.name} 2026`,
      `software engineer IT tech jobs ${country.name}`,
      `business administration finance jobs ${country.name}`
    ];
    let jobUrls: string[] = [];
    for (const q of jobQueries) {
      const urls = await searchGoogle(q, 100);
      jobUrls.push(...urls);
    }
    jobUrls = Array.from(new Set(jobUrls)).slice(0, TARGET_PAGES);
    console.log(`[JOBS] Scraping ${jobUrls.length} unique websites...`);

    let jobsCount = 0;
    await processInBatches(jobUrls, CONCURRENCY, async (url) => {
      const html = await fetchHtml(url);
      if (!html) return;
      const text = htmlToText(html, url);
      const extracted = await extractJobsWithAI(text, url);
      
      for (const job of extracted) {
        try {
          await db.insert(jobs).values({
            title: job.title,
            companyName: job.companyName,
            description: job.description,
            requirements: job.requirements,
            location: job.location,
            countryId: country.id,
            jobType: job.jobType,
            sourceUrl: job.sourceUrl,
            deadline: job.deadline,
          }).onConflictDoNothing({ target: jobs.sourceUrl });
          jobsCount++;
        } catch (e) {
          // ignore unique constraint errors
        }
      }
    });
    console.log(`[JOBS] Extracted and saved ${jobsCount} jobs for ${country.name}.`);

    // --- 2. TENDERS ---
    console.log(`\n[TENDERS] Fetching URLs for ${country.name}...`);
    const tenderQueries = [
      `government procurement tenders ${country.name} 2026`,
      `request for proposals open bids ${country.name}`,
      `NGO contracts and works tenders ${country.name}`
    ];
    let tenderUrls: string[] = [];
    for (const q of tenderQueries) {
      const urls = await searchGoogle(q, 100);
      tenderUrls.push(...urls);
    }
    tenderUrls = Array.from(new Set(tenderUrls)).slice(0, TARGET_PAGES);
    console.log(`[TENDERS] Scraping ${tenderUrls.length} unique websites...`);

    let tendersCount = 0;
    await processInBatches(tenderUrls, CONCURRENCY, async (url) => {
      const html = await fetchHtml(url);
      if (!html) return;
      const text = htmlToText(html, url);
      const extracted = await extractTendersWithAI(text, url);
      
      for (const tender of extracted) {
        try {
          await db.insert(tenders).values({
            referenceNo: tender.referenceNo,
            title: tender.title,
            description: tender.description,
            contractingAuthority: tender.contractingAuthority,
            countryId: country.id,
            category: tender.category,
            budget: tender.budget?.toString(),
            currency: tender.currency,
            sourceUrl: tender.sourceUrl,
            deadline: tender.deadline || new Date(),
          }).onConflictDoNothing({ target: tenders.sourceUrl });
          tendersCount++;
        } catch (e) {}
      }
    });
    console.log(`[TENDERS] Extracted and saved ${tendersCount} tenders for ${country.name}.`);

    // --- 3. COMPLIANCE ---
    console.log(`\n[COMPLIANCE] Fetching URLs for ${country.name}...`);
    const complianceQueries = [
      `business registration taxes compliance guidelines ${country.name}`,
      `revenue authority company forms ${country.name}`,
      `employment labor laws guidelines ${country.name}`
    ];
    let compUrls: string[] = [];
    for (const q of complianceQueries) {
      const urls = await searchGoogle(q, 100);
      compUrls.push(...urls);
    }
    compUrls = Array.from(new Set(compUrls)).slice(0, TARGET_PAGES);
    console.log(`[COMPLIANCE] Scraping ${compUrls.length} unique websites...`);

    let compCount = 0;
    await processInBatches(compUrls, CONCURRENCY, async (url) => {
      const html = await fetchHtml(url);
      if (!html) return;
      const text = htmlToText(html, url);
      const extracted = await extractResourcesWithAI(
        text, 
        `Government or Regulators of ${country.name}`, 
        url, 
        'Extract business compliance requirements, forms, and guidelines.'
      );
      
      for (const res of extracted) {
        try {
          await db.insert(complianceRequirements).values({
            title: res.title,
            description: res.description,
            countryId: country.id,
            category: 'business_registration',
            issuingAuthority: `Government of ${country.name}`,
            resourceType: res.resourceType,
            sourceUrl: res.sourceUrl,
          }).onConflictDoNothing();
          compCount++;
        } catch (e) {}
      }
    });
    console.log(`[COMPLIANCE] Extracted and saved ${compCount} resources for ${country.name}.`);

  }

  console.log('\n✅ Mass scraping completed entirely.');
  process.exit(0);
}

runMassScrape().catch(e => {
  console.error(e);
  process.exit(1);
});
