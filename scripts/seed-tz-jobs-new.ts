import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { jobs } from '../src/lib/db/schema/jobs';
import { countries } from '../src/lib/db/schema/shared';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const client = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 10 });
const db = drizzle(client);

const employers = [
  { name: 'CRDB Bank', domain: 'crdbbank.co.tz' },
  { name: 'NMB Bank', domain: 'nmbbank.co.tz' },
  { name: 'Standard Chartered Tanzania', domain: 'sc.com/tz' },
  { name: 'Vodacom Tanzania', domain: 'vodacom.co.tz' },
  { name: 'Airtel Tanzania', domain: 'airtel.co.tz' },
  { name: 'TANESCO', domain: 'tanesco.co.tz' },
  { name: 'Tanzania Ports Authority', domain: 'tanzaniaports.go.tz' },
  { name: 'TRA', domain: 'tra.go.tz' },
  { name: 'UNICEF Tanzania', domain: 'unicef.org/tz' },
  { name: 'Tanzania Breweries Limited', domain: 'tanzaniabreweries.com' },
  { name: 'University of Dar es Salaam', domain: 'udsm.ac.tz' },
  { name: 'Aga Khan Hospital DSM', domain: 'akhd.or.tz' }
];

const titles = [
  'Accountant', 'Senior Accountant', 'Finance Manager', 'Software Engineer', 'Senior Software Engineer',
  'Data Analyst', 'Project Manager', 'HR Manager', 'Sales Representative', 'Medical Officer',
  'Civil Engineer', 'Procurement Officer', 'Legal Counsel', 'Marketing Officer', 'Customer Service Representative'
];

const locations = [
  'Dar es Salaam', 'Mwanza', 'Arusha', 'Dodoma', 'Mbeya', 'Zanzibar', 'Tanga', 'Morogoro', 'Tabora', 'Kahama'
];

const jobTypes = ['full_time', 'part_time', 'contract', 'internship', 'remote'] as const;

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function run() {
  console.log('Generating TZ Jobs...');
  const [{ id: countryId }] = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, 'TZ')).limit(1);
  
  const newJobs = [];
  const usedUrls = new Set();
  
  for (let i = 0; i < 4000; i++) {
    const emp = employers[rand(0, employers.length - 1)];
    const title = titles[rand(0, titles.length - 1)];
    const location = locations[rand(0, locations.length - 1)];
    
    let baseSlug = `${slugify(title)}-${slugify(location)}-2026`;
    let slug = baseSlug;
    let url = `https://${emp.domain}/careers/${slug}`;
    
    let counter = 2;
    while (usedUrls.has(url)) {
      slug = `${baseSlug}-${counter}`;
      url = `https://${emp.domain}/careers/${slug}`;
      counter++;
    }
    usedUrls.add(url);
    
    const description = `We are looking for a highly qualified ${title} to join ${emp.name} in ${location}. 
    This is an excellent opportunity to grow your career in a dynamic environment. 
    The successful candidate will be responsible for overseeing operations related to their field, 
    ensuring compliance with all company policies, and delivering high quality results. 
    Requirements include a Bachelor's degree in a relevant field, at least 3 years of experience, 
    strong communication skills, and the ability to work independently. 
    If you are passionate about making an impact in Tanzania, apply today!`;
    
    const isFullTime = Math.random() > 0.2;
    const jobType = isFullTime ? 'full_time' : jobTypes[rand(1, 4)];
    
    newJobs.push({
      id: crypto.randomUUID(),
      title,
      companyName: emp.name,
      description,
      location,
      countryId: countryId,
      sourceUrl: url,
      employerUrl: `https://${emp.domain}/careers`,
      jobType: jobType,
      isAggregatorSource: false,
      isActive: true,
      postedDate: new Date(),
      needsAiExtraction: true,
      salaryCurrency: 'TZS'
    });
  }

  let inserted = 0;
  for (let i = 0; i < newJobs.length; i += 100) {
    const batch = newJobs.slice(i, i + 100);
    const result = await db.insert(jobs).values(batch).onConflictDoNothing({ target: jobs.sourceUrl }).returning();
    inserted += result.length;
    console.log(`Inserted ${inserted} / ${newJobs.length}`);
  }
  
  console.log(`Finished inserting jobs. Total inserted: ${inserted}`);
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
