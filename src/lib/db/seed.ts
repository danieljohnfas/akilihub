/**
 * Seed script: populate baseline data for East Africa countries, sectors, and job categories.
 * Run with: npx tsx src/lib/db/seed.ts
 */

import 'dotenv/config';
import { db } from './client';
import { countries, regions } from './schema/shared';
import { tenderSectors } from './schema/tenders';
import { jobCategories } from './schema/salaries';
import { businessTypes } from './schema/compliance';

async function seed() {
  console.log('🌱 Starting database seed...');

  // 1. Countries
  console.log('  → Seeding countries...');
  const insertedCountries = await db.insert(countries).values([
    { name: 'Kenya', code: 'KE' },
    { name: 'Tanzania', code: 'TZ' },
    { name: 'Uganda', code: 'UG' },
    { name: 'Rwanda', code: 'RW' },
    { name: 'Ethiopia', code: 'ET' },
  ]).onConflictDoNothing().returning();
  console.log(`     Seeded ${insertedCountries.length} countries`);

  // 2. Tender Sectors
  console.log('  → Seeding tender sectors...');
  const insertedSectors = await db.insert(tenderSectors).values([
    { name: 'Health & Pharmaceuticals', slug: 'health-pharmaceuticals' },
    { name: 'Construction & Infrastructure', slug: 'construction-infrastructure' },
    { name: 'ICT & Technology', slug: 'ict-technology' },
    { name: 'Agriculture & Food', slug: 'agriculture-food' },
    { name: 'Education & Training', slug: 'education-training' },
    { name: 'Water & Sanitation', slug: 'water-sanitation' },
    { name: 'Transport & Logistics', slug: 'transport-logistics' },
    { name: 'Energy', slug: 'energy' },
    { name: 'Financial Services', slug: 'financial-services' },
    { name: 'General Supplies', slug: 'general-supplies' },
  ]).onConflictDoNothing().returning();
  console.log(`     Seeded ${insertedSectors.length} sectors`);

  // 3. Job Categories
  console.log('  → Seeding job categories...');
  await db.insert(jobCategories).values([
    { name: 'Software & Technology', slug: 'software-technology' },
    { name: 'Finance & Accounting', slug: 'finance-accounting' },
    { name: 'Healthcare & Medicine', slug: 'healthcare-medicine' },
    { name: 'NGO & Development', slug: 'ngo-development' },
    { name: 'Education & Teaching', slug: 'education-teaching' },
    { name: 'Engineering', slug: 'engineering' },
    { name: 'Sales & Marketing', slug: 'sales-marketing' },
    { name: 'Human Resources', slug: 'human-resources' },
    { name: 'Legal', slug: 'legal' },
    { name: 'Administration', slug: 'administration' },
  ]).onConflictDoNothing();
  console.log(`     Seeded job categories`);

  // 4. Business Types (for compliance)
  const ke = insertedCountries.find(c => c.code === 'KE');
  const tz = insertedCountries.find(c => c.code === 'TZ');

  if (ke && tz) {
    console.log('  → Seeding business types...');
    await db.insert(businessTypes).values([
      { name: 'Sole Proprietorship', description: 'A business owned and operated by one person', countryId: ke.id },
      { name: 'Limited Company (Ltd)', description: 'A company limited by shares', countryId: ke.id },
      { name: 'Partnership', description: 'A business run by two or more partners', countryId: ke.id },
      { name: 'NGO / Non-Profit', description: 'A non-governmental organization', countryId: ke.id },
      { name: 'Sole Proprietorship', description: 'Biashara inayomilikiwa na mtu mmoja', countryId: tz.id },
      { name: 'Limited Company (Ltd)', description: 'Kampuni yenye wanahisa', countryId: tz.id },
    ]).onConflictDoNothing();
    console.log(`     Seeded business types`);
  }

  console.log('\n✅ Seed complete!');
  process.exit(0);
}

seed().catch(e => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
