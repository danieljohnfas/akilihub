import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { salarySubmissions, jobCategories } from '../src/lib/db/schema/salaries';
import { countries } from '../src/lib/db/schema/shared';
import { eq, ilike } from 'drizzle-orm';
import crypto from 'crypto';

const client = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 5 });
const db = drizzle(client);

const jobTitles = [
  // Technology
  { title: 'Software Engineer', search: '%Software%', levels: [
    { level: 'entry', min: 700000, max: 1200000 },
    { level: 'mid', min: 2000000, max: 4000000 },
    { level: 'senior', min: 5000000, max: 9000000 },
    { level: 'executive', min: 10000000, max: 20000000 }
  ]},
  { title: 'Data Analyst', search: '%Data%', levels: [
    { level: 'entry', min: 600000, max: 1000000 },
    { level: 'mid', min: 1500000, max: 3000000 },
    { level: 'senior', min: 4000000, max: 7000000 }
  ]},
  { title: 'Data Scientist', search: '%Data%', levels: [
    { level: 'entry', min: 1000000, max: 1800000 },
    { level: 'mid', min: 2500000, max: 5000000 },
    { level: 'senior', min: 6000000, max: 12000000 },
    { level: 'executive', min: 12000000, max: 20000000 }
  ]},
  { title: 'DevOps Engineer', search: '%DevOps%', levels: [
    { level: 'entry', min: 900000, max: 1500000 },
    { level: 'mid', min: 2500000, max: 4500000 },
    { level: 'senior', min: 5000000, max: 9000000 }
  ]},
  { title: 'Product Manager', search: '%Product%', levels: [
    { level: 'entry', min: 1200000, max: 2000000 },
    { level: 'mid', min: 3000000, max: 6000000 },
    { level: 'senior', min: 7000000, max: 12000000 },
    { level: 'executive', min: 15000000, max: 25000000 }
  ]},
  // Finance/Banking
  { title: 'Accountant', search: '%Account%', levels: [
    { level: 'entry', min: 700000, max: 1200000 },
    { level: 'mid', min: 1500000, max: 2800000 },
    { level: 'senior', min: 3000000, max: 5500000 },
    { level: 'executive', min: 8000000, max: 15000000 }
  ]},
  { title: 'Finance Manager', search: '%Finance%', levels: [
    { level: 'mid', min: 3000000, max: 5500000 },
    { level: 'senior', min: 6000000, max: 10000000 },
    { level: 'executive', min: 12000000, max: 20000000 }
  ]},
  // Health
  { title: 'Medical Officer', search: '%Medic%', levels: [
    { level: 'entry', min: 2000000, max: 3500000 },
    { level: 'mid', min: 3500000, max: 6000000 },
    { level: 'senior', min: 7000000, max: 12000000 },
    { level: 'executive', min: 15000000, max: 25000000 }
  ]},
  { title: 'Registered Nurse', search: '%Nurs%', levels: [
    { level: 'entry', min: 700000, max: 1200000 },
    { level: 'mid', min: 1500000, max: 2800000 },
    { level: 'senior', min: 3000000, max: 5000000 }
  ]},
  // Engineering
  { title: 'Civil Engineer', search: '%Civil%', levels: [
    { level: 'entry', min: 1000000, max: 1800000 },
    { level: 'mid', min: 2500000, max: 4500000 },
    { level: 'senior', min: 5000000, max: 9000000 },
    { level: 'executive', min: 12000000, max: 20000000 }
  ]},
  { title: 'Electrical Engineer', search: '%Electrical%', levels: [
    { level: 'entry', min: 1100000, max: 1900000 },
    { level: 'mid', min: 2800000, max: 5000000 },
    { level: 'senior', min: 6000000, max: 10000000 }
  ]}
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function run() {
  console.log('Generating TZ Salaries...');
  const [{ id: countryId }] = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, 'TZ')).limit(1);
  
  const allCategories = await db.select({ id: jobCategories.id, name: jobCategories.name }).from(jobCategories);
  
  const newSalaries = [];
  
  for (const job of jobTitles) {
    // fuzzy match category
    let categoryId = allCategories[0]?.id || null;
    for (const cat of allCategories) {
      if (cat.name.toLowerCase().includes(job.search.toLowerCase().replace(/%/g, ''))) {
        categoryId = cat.id;
        break;
      }
    }
    
    for (const levelObj of job.levels) {
      const numPoints = rand(20, 30);
      for (let i = 0; i < numPoints; i++) {
        const gross = rand(levelObj.min, levelObj.max);
        const net = Math.round(gross * 0.80);
        
        let years = 0;
        if (levelObj.level === 'entry') years = rand(0, 2);
        else if (levelObj.level === 'mid') years = rand(3, 7);
        else if (levelObj.level === 'senior') years = rand(8, 15);
        else if (levelObj.level === 'executive') years = rand(12, 25);
        
        let empType = 'full_time';
        if (Math.random() > 0.8) empType = 'contract';
        
        newSalaries.push({
          id: crypto.randomUUID(),
          jobTitle: job.title,
          jobCategoryId: categoryId,
          employerId: null,
          countryId: countryId,
          experienceLevel: levelObj.level as 'entry' | 'mid' | 'senior' | 'executive',
          employmentType: empType as 'full_time' | 'part_time' | 'contract' | 'consultancy',
          currency: 'TZS',
          grossMonthlySalary: gross.toString(),
          netMonthlySalary: net.toString(),
          yearsOfExperience: years,
          isAnonymous: true,
          isVerified: false,
          sourceUrl: null
        });
      }
    }
  }

  let inserted = 0;
  for (let i = 0; i < newSalaries.length; i += 100) {
    const batch = newSalaries.slice(i, i + 100);
    const result = await db.insert(salarySubmissions).values(batch).returning();
    inserted += result.length;
    console.log(`Inserted ${inserted} / ${newSalaries.length}`);
  }
  
  console.log(`Finished inserting salaries. Total inserted: ${inserted}`);
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
