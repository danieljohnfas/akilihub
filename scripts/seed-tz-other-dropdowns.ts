import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { countries } from '../src/lib/db/schema/shared';
import { tenderSectors } from '../src/lib/db/schema/tenders';
import { jobCategories } from '../src/lib/db/schema/salaries';
import { businessTypes } from '../src/lib/db/schema/compliance';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const client = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 5 });
const db = drizzle(client);

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

const TENDER_SECTORS = [
  'Agriculture & Farming',
  'Construction & Engineering',
  'Health & Medical Equipment',
  'ICT & Technology',
  'Education & Training',
  'Energy & Power',
  'Transport & Logistics',
  'General Supplies'
];

const JOB_CATEGORIES = [
  'Technology & Software',
  'Data & Analytics',
  'Finance & Accounting',
  'Healthcare & Medical',
  'Engineering & Construction',
  'Operations & Supply Chain',
  'Sales & Marketing',
  'Legal & Compliance',
  'Human Resources',
  'Executive & Management'
];

const BUSINESS_TYPES = [
  { name: 'Private Limited Company (LTD)', desc: 'Standard private company limited by shares' },
  { name: 'Public Limited Company (PLC)', desc: 'Public company with shares traded' },
  { name: 'Non-Governmental Organisation (NGO)', desc: 'Charitable or non-profit organization' },
  { name: 'Sole Proprietorship', desc: 'Business owned by a single individual' },
  { name: 'Partnership', desc: 'Business owned by two or more partners' },
  { name: 'Parastatal / Government Agency', desc: 'State-owned enterprise or agency' },
  { name: 'Foreign Branch', desc: 'Branch of a company incorporated outside Tanzania' }
];

async function run() {
  console.log('Generating Other Dropdowns (Sectors, Categories, Business Types)...');
  
  const [{ id: countryId }] = await db
    .select({ id: countries.id })
    .from(countries)
    .where(eq(countries.code, 'TZ'))
    .limit(1);

  // Seed Tender Sectors
  for (const name of TENDER_SECTORS) {
    const slug = slugify(name);
    await db.insert(tenderSectors).values({
      id: crypto.randomUUID(),
      name,
      slug
    }).onConflictDoNothing({ target: tenderSectors.name });
  }
  console.log(`Seeded Tender Sectors`);

  // Seed Job Categories
  for (const name of JOB_CATEGORIES) {
    const slug = slugify(name);
    await db.insert(jobCategories).values({
      id: crypto.randomUUID(),
      name,
      slug
    }).onConflictDoNothing({ target: jobCategories.slug });
  }
  console.log(`Seeded Job Categories`);

  // Seed Business Types
  for (const type of BUSINESS_TYPES) {
    await db.insert(businessTypes).values({
      id: crypto.randomUUID(),
      name: type.name,
      description: type.desc,
      countryId
    }).onConflictDoNothing({ target: businessTypes.name });
  }
  console.log(`Seeded Business Types`);

  console.log('Finished seeding dropdowns.');
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
