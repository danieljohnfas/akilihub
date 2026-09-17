import 'dotenv/config';
import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { countries } from '../src/lib/db/schema/shared';
import { inArray } from 'drizzle-orm';

async function main() {
  console.log("Fetching DB countries...");
  const targetCountries = ["Kenya", "Tanzania", "Uganda", "Rwanda", "Ghana", "Nigeria", "Zambia", "South Africa", "Ethiopia"];
  const dbCountries = await db.select().from(countries).where(inArray(countries.name, targetCountries));
  
  const countryIds = dbCountries.map(c => c.id);
  if (countryIds.length === 0) {
    console.log("No countries found.");
    return;
  }

  const jobTitles = [
    "Senior Software Engineer", "Product Manager", "Data Analyst", 
    "DevOps Specialist", "Marketing Director", "Operations Manager",
    "Customer Success Lead", "Frontend Developer", "Backend Engineer",
    "UX/UI Designer", "Financial Controller", "HR Business Partner"
  ];

  const companies = [
    "Safaricom", "KCB Group", "MTN", "Standard Bank", 
    "Dangote Group", "Equity Bank", "Vodacom", "Airtel",
    "Paystack", "Flutterwave", "Andela", "Cellulant"
  ];

  const insertBatch = [];
  
  console.log("Generating 100 realistic job listings...");
  
  for (let i = 0; i < 100; i++) {
    const title = jobTitles[Math.floor(Math.random() * jobTitles.length)];
    const company = companies[Math.floor(Math.random() * companies.length)];
    const countryId = countryIds[Math.floor(Math.random() * countryIds.length)];
    const isFullTime = Math.random() > 0.2;
    
    insertBatch.push({
      title: `${title} - ${company}`,
      companyName: company,
      description: `We are looking for an experienced ${title} to join our team at ${company}. You will be responsible for leading key initiatives and driving growth. Requires 3+ years of experience and a strong track record of success.`,
      countryId: countryId,
      jobType: isFullTime ? "full_time" as any : "contract" as any,
      sourceUrl: `https://${company.toLowerCase().replace(' ', '')}.com/careers/job-${i}`,
      employerUrl: `https://${company.toLowerCase().replace(' ', '')}.com`,
      postedDate: new Date(Date.now() - Math.floor(Math.random() * 10) * 86400000), // Random past 10 days
      deadline: new Date(Date.now() + Math.floor(Math.random() * 30) * 86400000), // Random next 30 days
      isActive: true,
      sector: "Technology & Finance",
      needsAiExtraction: false
    });
  }

  console.log(`Inserting ${insertBatch.length} jobs into Postgres...`);
  
  let insertedCount = 0;
  for (let i = 0; i < insertBatch.length; i += 50) {
    const chunk = insertBatch.slice(i, i + 50);
    try {
      const result = await db.insert(jobs).values(chunk).onConflictDoNothing().returning({ id: jobs.id });
      insertedCount += result.length;
    } catch (e: any) {
      console.error(`Batch insert error:`, e.message);
    }
  }

  console.log(`Successfully inserted ${insertedCount} new jobs!`);
}

main().catch(console.error).finally(() => process.exit(0));
