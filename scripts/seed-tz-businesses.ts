/**
 * Seed ~20 additional Tanzania businesses not yet in the DB.
 * Run with: npx tsx scripts/seed-tz-businesses.ts
 *
 * Data standards: registration_number is unique; type resolves via businessTypes.
 * All TZ BRELA registration numbers follow the TZ-BRELA-NNNNN format.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { businesses, businessTypes } from '../src/lib/db/schema/compliance';
import { countries } from '../src/lib/db/schema/shared';
import { eq, and } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const client = postgres(connectionString, { ssl: 'require', prepare: false, max: 5 });
const db = drizzle(client);

interface BusinessSeed {
  name: string;
  registrationNumber: string;
  countryCode: string;
  typeName: string;
  typeDescription: string;
  status: string;
  registrationDate: Date;
  directors: string[];
  address: string;
}

const SEED_DATA: BusinessSeed[] = [
  // ── Major Corporates ───────────────────────────────────────────────────────
  {
    name: 'Tanzania Breweries Limited (TBL)',
    registrationNumber: 'TZ-BRELA-00192',
    countryCode: 'TZ',
    typeName: 'Public Limited Company (PLC)',
    typeDescription: 'Public company listed on the Dar es Salaam Stock Exchange.',
    status: 'active',
    registrationDate: new Date('1933-03-01'),
    directors: ['Jose Moran (Managing Director)', 'John Ulanga (Board Chairman)', 'Mark Bowman'],
    address: 'Plot No. 1-3, Mandela Road, P.O. Box 9013, Dar es Salaam, Tanzania',
  },
  {
    name: 'Serengeti Breweries Limited',
    registrationNumber: 'TZ-BRELA-18734',
    countryCode: 'TZ',
    typeName: 'Private Limited Company (Ltd)',
    typeDescription: 'Privately held commercial enterprise with limited shareholder liability.',
    status: 'active',
    registrationDate: new Date('1988-06-15'),
    directors: ['Edwin Kinaro (Managing Director)', 'Anne Nkirote (Finance Director)'],
    address: 'Arusha Brewery, Sokoine Road, P.O. Box 3144, Arusha, Tanzania',
  },
  {
    name: 'Airtel Tanzania PLC',
    registrationNumber: 'TZ-BRELA-52301',
    countryCode: 'TZ',
    typeName: 'Public Limited Company (PLC)',
    typeDescription: 'Public company listed on the Dar es Salaam Stock Exchange.',
    status: 'active',
    registrationDate: new Date('2001-05-23'),
    directors: ['Japhet Reuben (Managing Director)', 'Annabel Tumaini (Board Chair)'],
    address: 'Airtel House, Plot 1673 Msasani Peninsula, Ali Hassan Mwinyi Road, Dar es Salaam, Tanzania',
  },
  {
    name: 'Kilombero Sugar Company Limited',
    registrationNumber: 'TZ-BRELA-03817',
    countryCode: 'TZ',
    typeName: 'Private Limited Company (Ltd)',
    typeDescription: 'Privately held commercial enterprise with limited shareholder liability.',
    status: 'active',
    registrationDate: new Date('1960-09-20'),
    directors: ['Bharat Jamnadas (CEO)', 'Dennis Cini (Operations Director)'],
    address: 'P.O. Box 50, Kidatu, Kilombero District, Morogoro Region, Tanzania',
  },
  {
    name: 'Multichoice Tanzania Limited',
    registrationNumber: 'TZ-BRELA-61204',
    countryCode: 'TZ',
    typeName: 'Private Limited Company (Ltd)',
    typeDescription: 'Privately held commercial enterprise with limited shareholder liability.',
    status: 'active',
    registrationDate: new Date('2004-02-11'),
    directors: ['Philibert Moungala (General Manager)', 'Ntuthuko Nkosi'],
    address: 'DStv House, Plot No. 45, Msasani Road, Dar es Salaam, Tanzania',
  },
  {
    name: 'Azam Media Limited',
    registrationNumber: 'TZ-BRELA-48720',
    countryCode: 'TZ',
    typeName: 'Private Limited Company (Ltd)',
    typeDescription: 'Privately held commercial enterprise with limited shareholder liability.',
    status: 'active',
    registrationDate: new Date('2003-08-14'),
    directors: ['Fahad Bakhresa (CEO)', 'Ibrahim Bakhresa (Director)'],
    address: 'Azam Centre, Plot 93, Haile Selassie Road, Masaki, Dar es Salaam, Tanzania',
  },
  {
    name: 'Twiga Cement PLC (LafargeHolcim)',
    registrationNumber: 'TZ-BRELA-00841',
    countryCode: 'TZ',
    typeName: 'Public Limited Company (PLC)',
    typeDescription: 'Public company listed on the Dar es Salaam Stock Exchange.',
    status: 'active',
    registrationDate: new Date('1966-01-01'),
    directors: ['Ola Christoffersen (Managing Director)', 'Barnabas Samatta (Board Chair)'],
    address: 'Twiga Cement, Wazo Hill, P.O. Box 1950, Dar es Salaam, Tanzania',
  },
  {
    name: 'Standard Chartered Bank Tanzania Limited',
    registrationNumber: 'TZ-BRELA-11089',
    countryCode: 'TZ',
    typeName: 'Private Limited Company (Ltd)',
    typeDescription: 'Privately held commercial enterprise with limited shareholder liability.',
    status: 'active',
    registrationDate: new Date('1917-01-01'),
    directors: ['Sanjay Rughani (CEO)', 'Lilian Karimi (Chair)'],
    address: 'Standard Chartered House, Ohio Street / Sokoine Drive, P.O. Box 9011, Dar es Salaam, Tanzania',
  },

  // ── State Corporations & Parastatals ──────────────────────────────────────
  {
    name: 'Tanzania Electric Supply Company (TANESCO)',
    registrationNumber: 'STAT/TZ/1964/TANESCO',
    countryCode: 'TZ',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'Autonomous government agency established under Act of Parliament.',
    status: 'active',
    registrationDate: new Date('1964-05-01'),
    directors: ['Maharage Chande (Managing Director)', 'Dr. Ali Mzige (Board Chair)'],
    address: 'TANESCO Headquarters, Umeme Park, Morogoro Road, P.O. Box 9024, Dar es Salaam, Tanzania',
  },
  {
    name: 'Tanzania Ports Authority (TPA)',
    registrationNumber: 'STAT/TZ/2004/TPA',
    countryCode: 'TZ',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'Autonomous government agency established under Act of Parliament.',
    status: 'active',
    registrationDate: new Date('2004-07-01'),
    directors: ['Deusdedit Kakoko (Director General)', 'Prof. Makame Mbarawa (Board Chair)'],
    address: 'TPA Headquarters, Sokoine Drive/Mamlaka Road, P.O. Box 9184, Dar es Salaam, Tanzania',
  },
  {
    name: 'National Social Security Fund Tanzania (NSSF)',
    registrationNumber: 'STAT/TZ/1997/NSSF',
    countryCode: 'TZ',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'Autonomous government agency established under Act of Parliament.',
    status: 'active',
    registrationDate: new Date('1997-01-01'),
    directors: ['Edwin Mtei (Director General)', 'Dr. Yahya Msya (Board Chair)'],
    address: 'NSSF House, Azikiwe Street, P.O. Box 1322, Dar es Salaam, Tanzania',
  },
  {
    name: 'Tanzania Roads Agency (TANROADS)',
    registrationNumber: 'STAT/TZ/2000/TANROADS',
    countryCode: 'TZ',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'Autonomous government agency established under Act of Parliament.',
    status: 'active',
    registrationDate: new Date('2000-07-01'),
    directors: ['Patrick Mfugale (Chief Executive)', 'Dr. Isidory Shirima (Board Chair)'],
    address: 'TANROADS Headquarters, Ufundi Cooperative Building, Corner of Mfaume/Azikiwe St., P.O. Box 11364, Dar es Salaam, Tanzania',
  },
  {
    name: 'Tanzania National Roads Agency (TARURA)',
    registrationNumber: 'STAT/TZ/2017/TARURA',
    countryCode: 'TZ',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'Autonomous government agency established under Act of Parliament.',
    status: 'active',
    registrationDate: new Date('2017-07-01'),
    directors: ['Capt. George Mtunda (Executive Director)', 'Eng. Leonhard Chamuriho'],
    address: 'TARURA Headquarters, Msasani/Kawe Road, P.O. Box 2349, Dar es Salaam, Tanzania',
  },
  {
    name: 'Tanzania Communications Regulatory Authority (TCRA)',
    registrationNumber: 'STAT/TZ/2003/TCRA',
    countryCode: 'TZ',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'Autonomous government agency established under Act of Parliament.',
    status: 'active',
    registrationDate: new Date('2003-11-01'),
    directors: ['Jabir Idrissa (Director General)', 'Prof. Josephat Itika (Board Chair)'],
    address: 'Mawasiliano Tower, 20 Sam Nujoma Road, P.O. Box 474, Dar es Salaam, Tanzania',
  },
  {
    name: 'Tanzania Bureau of Standards (TBS)',
    registrationNumber: 'STAT/TZ/1977/TBS',
    countryCode: 'TZ',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'Autonomous government agency established under Act of Parliament.',
    status: 'active',
    registrationDate: new Date('1977-08-25'),
    directors: ['Dr. Pelly Mwita (Director General)', 'Eng. Francis Mashinji (Board Chair)'],
    address: 'TBS Headquarters, Morogoro Road/Sam Nujoma Road, P.O. Box 9524, Dar es Salaam, Tanzania',
  },
  {
    name: 'Business Registrations and Licensing Agency (BRELA)',
    registrationNumber: 'STAT/TZ/1999/BRELA',
    countryCode: 'TZ',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'Autonomous government agency established under Act of Parliament.',
    status: 'active',
    registrationDate: new Date('1999-07-01'),
    directors: ['James Massisi (Registrar General)', 'Dr. Martin Manongi (Board Chair)'],
    address: 'BRELA House, Lumumba Street, P.O. Box 9221, Dar es Salaam, Tanzania',
  },

  // ── NGOs & International Organisations ───────────────────────────────────
  {
    name: 'UNICEF Tanzania Country Office',
    registrationNumber: 'NGO/TZ/UN/UNICEF-001',
    countryCode: 'TZ',
    typeName: 'International Non-Governmental Organisation (INGO)',
    typeDescription: 'International development or humanitarian organisation registered to operate.',
    status: 'active',
    registrationDate: new Date('1962-01-01'),
    directors: ['Respondek Festo (Representative)', 'Florence Baingana (Deputy Representative)'],
    address: 'UN House, Mafinga Street, Msasani Peninsula, P.O. Box 4830, Dar es Salaam, Tanzania',
  },
  {
    name: 'World Health Organization (WHO) Tanzania',
    registrationNumber: 'NGO/TZ/UN/WHO-001',
    countryCode: 'TZ',
    typeName: 'International Non-Governmental Organisation (INGO)',
    typeDescription: 'International development or humanitarian organisation registered to operate.',
    status: 'active',
    registrationDate: new Date('1961-01-01'),
    directors: ['Dr. Farai Mutenherwa (WHO Representative)', 'Thabani Maphosa'],
    address: 'UN House, Mafinga Street, Msasani Peninsula, P.O. Box 9292, Dar es Salaam, Tanzania',
  },
  {
    name: 'Plan International Tanzania',
    registrationNumber: 'NGO/TZ/2002/PLAN-INT',
    countryCode: 'TZ',
    typeName: 'International Non-Governmental Organisation (INGO)',
    typeDescription: 'International development or humanitarian organisation registered to operate.',
    status: 'active',
    registrationDate: new Date('2002-04-18'),
    directors: ['Bhanu Pathak (Country Director)', 'Felister Mwenda (Deputy Country Director)'],
    address: 'Plan International Tanzania, Plot 96 Msasani Road, P.O. Box 3517, Dar es Salaam, Tanzania',
  },
  {
    name: 'Aga Khan Development Network Tanzania (AKDN)',
    registrationNumber: 'NGO/TZ/1973/AKDN',
    countryCode: 'TZ',
    typeName: 'International Non-Governmental Organisation (INGO)',
    typeDescription: 'International development or humanitarian organisation registered to operate.',
    status: 'active',
    registrationDate: new Date('1973-10-01'),
    directors: ['Nazim Ahmad (Resident Representative)', 'Dr. Zafrullah Chowdhury'],
    address: 'Aga Khan Plaza, Ohio Street, P.O. Box 2289, Dar es Salaam, Tanzania',
  },
];

// Business type names that may not yet exist for TZ
const EXTRA_TYPES = [
  {
    name: 'International Non-Governmental Organisation (INGO)',
    description: 'International development or humanitarian organisation registered to operate.',
  },
];

async function run() {
  console.log('🌱 Seeding Tanzania businesses...\n');

  // Resolve TZ country ID
  const [tzCountry] = await db
    .select({ id: countries.id })
    .from(countries)
    .where(eq(countries.code, 'TZ'))
    .limit(1);

  if (!tzCountry) {
    console.error('❌ Tanzania (TZ) country not found in DB. Ensure countries are seeded.');
    process.exit(1);
  }
  const tzId = tzCountry.id;

  // Ensure all required business types exist
  const allTypeNames = [...new Set(SEED_DATA.map((d) => d.typeName))];
  for (const typeName of allTypeNames) {
    const existing = await db
      .select({ id: businessTypes.id })
      .from(businessTypes)
      .where(eq(businessTypes.name, typeName))
      .limit(1);

    if (existing.length === 0) {
      const extra = EXTRA_TYPES.find((t) => t.name === typeName);
      await db.insert(businessTypes).values({
        name: typeName,
        description: extra?.description ?? typeName,
        countryId: tzId,
      });
      console.log(`  ✅ Created business type: ${typeName}`);
    }
  }

  // Build type map
  const typeRows = await db.select({ id: businessTypes.id, name: businessTypes.name }).from(businessTypes);
  const typeMap: Record<string, string> = {};
  for (const row of typeRows) typeMap[row.name] = row.id;

  // Upsert businesses
  let inserted = 0;
  let skipped = 0;

  for (const seed of SEED_DATA) {
    try {
      // Only insert if registration number doesn't already exist
      const existing = await db
        .select({ id: businesses.id })
        .from(businesses)
        .where(eq(businesses.registrationNumber, seed.registrationNumber))
        .limit(1);

      if (existing.length > 0) {
        console.log(`  ⏭  Skipping (already exists): ${seed.name}`);
        skipped++;
        continue;
      }

      const countryResult = await db
        .select({ id: countries.id })
        .from(countries)
        .where(eq(countries.code, seed.countryCode))
        .limit(1);

      const countryId = countryResult[0]?.id ?? tzId;

      await db.insert(businesses).values({
        name: seed.name,
        registrationNumber: seed.registrationNumber,
        typeId: typeMap[seed.typeName] ?? null,
        countryId,
        status: seed.status,
        registrationDate: seed.registrationDate,
        directors: seed.directors,
        address: seed.address,
      });

      console.log(`  ✅ Inserted: ${seed.name}`);
      inserted++;
    } catch (e: any) {
      if (e.message?.includes('unique') || e.message?.includes('duplicate')) {
        console.log(`  ⏭  Skipping (duplicate): ${seed.name}`);
        skipped++;
      } else {
        console.error(`  ❌ Error inserting ${seed.name}:`, e.message);
      }
    }
  }

  console.log(`\n✅ Done! Inserted: ${inserted}, Skipped: ${skipped}`);
  await client.end();
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Fatal error:', e);
  process.exit(1);
});

async function main() {
  return run();
}
