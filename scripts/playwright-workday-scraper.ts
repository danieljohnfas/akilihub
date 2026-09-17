import { chromium } from 'playwright';
import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { countries } from '../src/lib/db/schema/shared';
import { inArray } from 'drizzle-orm';

async function main() {
  console.log("Fetching DB countries...");
  const targetCountries = ["Kenya", "Tanzania", "Uganda", "Rwanda", "Ghana", "Nigeria", "Zambia", "South Africa", "Ethiopia"];
  const dbCountries = await db.select().from(countries).where(inArray(countries.name, targetCountries));
  const countryMap = new Map<string, string>();
  for (const c of dbCountries) {
    countryMap.set(c.name, c.id);
  }

  console.log("Launching headless browser to crawl Workday and Taleo portals...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const extractedJobs = [];

  // SAFARICOM (Workday)
  try {
    console.log("Navigating to Safaricom Workday...");
    await page.goto('https://safaricom.wd3.myworkdayjobs.com/Safaricom_Careers', { waitUntil: 'networkidle', timeout: 45000 });
    
    // Wait for the job listings to render in the DOM
    await page.waitForSelector('ul[role="list"] li', { timeout: 15000 });

    const safaricomJobs = await page.evaluate(() => {
      const jobNodes = document.querySelectorAll('ul[role="list"] li');
      const results = [];
      jobNodes.forEach(node => {
        const titleEl = node.querySelector('h3 a');
        const title = titleEl ? (titleEl as HTMLElement).innerText : null;
        const link = titleEl ? (titleEl as HTMLAnchorElement).href : null;
        
        // Workday typically puts location and job type in dl/dt/dd tags
        const details = Array.from(node.querySelectorAll('dd')).map(dd => (dd as HTMLElement).innerText).join(" | ");
        
        if (title && link) {
          results.push({ title, link, details });
        }
      });
      return results;
    });

    console.log(`Extracted ${safaricomJobs.length} jobs from Safaricom via DOM.`);
    for (const job of safaricomJobs) {
      extractedJobs.push({
        title: job.title,
        companyName: "Safaricom",
        description: `Location/Type: ${job.details}`,
        countryId: countryMap.get("Kenya"),
        jobType: "full_time" as any,
        sourceUrl: job.link,
        employerUrl: "https://www.safaricom.co.ke/careers",
        postedDate: new Date(),
        deadline: null,
        isActive: true,
        sector: "Telecommunications",
        needsAiExtraction: false
      });
    }
  } catch (e: any) {
    console.error("Failed to scrape Safaricom via browser:", e.message);
  }

  // ABSA BANK (Workday)
  try {
    console.log("Navigating to Absa Bank Workday...");
    await page.goto('https://absa.wd3.myworkdayjobs.com/AbsaCareers', { waitUntil: 'networkidle', timeout: 45000 });
    
    await page.waitForSelector('ul[role="list"] li', { timeout: 15000 });

    const absaJobs = await page.evaluate(() => {
      const jobNodes = document.querySelectorAll('ul[role="list"] li');
      const results = [];
      jobNodes.forEach(node => {
        const titleEl = node.querySelector('h3 a');
        const title = titleEl ? (titleEl as HTMLElement).innerText : null;
        const link = titleEl ? (titleEl as HTMLAnchorElement).href : null;
        const details = Array.from(node.querySelectorAll('dd')).map(dd => (dd as HTMLElement).innerText).join(" | ");
        if (title && link) {
          results.push({ title, link, details });
        }
      });
      return results;
    });

    console.log(`Extracted ${absaJobs.length} jobs from Absa via DOM.`);
    for (const job of absaJobs) {
      // Guess country from details
      let cId = countryMap.get("South Africa"); // Default
      for (const [name, id] of countryMap.entries()) {
        if (job.details.includes(name)) cId = id;
      }

      extractedJobs.push({
        title: job.title,
        companyName: "Absa Bank",
        description: `Location/Type: ${job.details}`,
        countryId: cId,
        jobType: "full_time" as any,
        sourceUrl: job.link,
        employerUrl: "https://absa.africa/careers",
        postedDate: new Date(),
        deadline: null,
        isActive: true,
        sector: "Banking & Finance",
        needsAiExtraction: false
      });
    }
  } catch (e: any) {
    console.error("Failed to scrape Absa via browser:", e.message);
  }

  await browser.close();

  if (extractedJobs.length > 0) {
    console.log(`Inserting ${extractedJobs.length} real jobs into Postgres...`);
    let insertedCount = 0;
    for (let i = 0; i < extractedJobs.length; i += 50) {
      const chunk = extractedJobs.slice(i, i + 50);
      try {
        const result = await db.insert(jobs).values(chunk).onConflictDoNothing().returning({ id: jobs.id });
        insertedCount += result.length;
      } catch (e: any) {
        console.error(`Batch insert error:`, e.message);
      }
    }
    console.log(`Successfully inserted ${insertedCount} real jobs from browser extraction!`);
  } else {
    console.log("No jobs extracted by the browser.");
  }
}

main().catch(console.error).finally(() => process.exit(0));
