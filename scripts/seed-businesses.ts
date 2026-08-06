import { config } from 'dotenv';
config({ path: '.env.local' });

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { businesses, businessTypes } from '../src/lib/db/schema/compliance';
import { countries } from '../src/lib/db/schema/shared';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const client = postgres(connectionString, {
  ssl: 'require',
  prepare: false,
  max: 5,
});

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
  // Kenya (KE)
  {
    name: 'Safaricom PLC',
    registrationNumber: 'CPR/2011/56821',
    countryCode: 'KE',
    typeName: 'Public Limited Company (PLC)',
    typeDescription: 'Public company listed on the Nairobi Securities Exchange with public shareholding.',
    status: 'active',
    registrationDate: new Date('1997-04-03'),
    directors: ['Peter Ndegwa (CEO)', 'Adil Khawaja (Chairman)', 'Michael Joseph', 'Dilip Pal'],
    address: 'Safaricom House, Waiyaki Way, Westlands, P.O. Box 66827-00800, Nairobi, Kenya',
  },
  {
    name: 'Equity Group Holdings PLC',
    registrationNumber: 'CPR/2014/162839',
    countryCode: 'KE',
    typeName: 'Public Limited Company (PLC)',
    typeDescription: 'Public company listed on the Nairobi Securities Exchange with public shareholding.',
    status: 'active',
    registrationDate: new Date('1984-10-15'),
    directors: ['Dr. James Mwangi (Group CEO)', 'Prof. Isaac Macharia (Chairman)', 'Mary Wamae'],
    address: 'Equity Centre, Hospital Road, Upper Hill, P.O. Box 75104-00200, Nairobi, Kenya',
  },
  {
    name: 'KCB Group PLC',
    registrationNumber: 'CPR/2008/11294',
    countryCode: 'KE',
    typeName: 'Public Limited Company (PLC)',
    typeDescription: 'Public company listed on the Nairobi Securities Exchange with public shareholding.',
    status: 'active',
    registrationDate: new Date('1896-01-01'),
    directors: ['Paul Russo (CEO)', 'Dr. Joseph Kinyua (Chairman)', 'Lawrence Kimathi'],
    address: 'Kencom House, Moi Avenue, P.O. Box 48400-00100, Nairobi, Kenya',
  },
  {
    name: 'Kenya Medical Supplies Authority (KEMSA)',
    registrationNumber: 'STAT/KE/2000/01',
    countryCode: 'KE',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'Autonomous government agency established under Act of Parliament.',
    status: 'active',
    registrationDate: new Date('2000-02-11'),
    directors: ['Dr. Andrew Mulwa (CEO)', 'Irungu Nyakera (Board Chair)'],
    address: 'Commercial Street, Industrial Area, P.O. Box 47715-00100, Nairobi, Kenya',
  },
  {
    name: 'Kenya Revenue Authority (KRA)',
    registrationNumber: 'STAT/KE/1995/KRA',
    countryCode: 'KE',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'Autonomous government agency established under Act of Parliament.',
    status: 'active',
    registrationDate: new Date('1995-07-01'),
    directors: ['Humphrey Wattanga (Commissioner General)', 'Anthony Mwaura (Board Chair)'],
    address: 'Times Tower, Haile Selassie Avenue, P.O. Box 48240-00100, Nairobi, Kenya',
  },
  {
    name: 'Twiga Foods Limited',
    registrationNumber: 'PVT-2014-99120',
    countryCode: 'KE',
    typeName: 'Private Limited Company (Ltd)',
    typeDescription: 'Privately held commercial enterprise with limited shareholder liability.',
    status: 'active',
    registrationDate: new Date('2014-04-12'),
    directors: ['Charles Muchene (Board Chair)', 'Peter Njonjo', 'Grant Brooke'],
    address: 'Riverside Square, Riverside Drive, P.O. Box 2433-00606, Nairobi, Kenya',
  },

  // Tanzania (TZ)
  {
    name: 'Vodacom Tanzania PLC',
    registrationNumber: 'TZ-BRELA-38502',
    countryCode: 'TZ',
    typeName: 'Public Limited Company (PLC)',
    typeDescription: 'Public company listed on the Dar es Salaam Stock Exchange.',
    status: 'active',
    registrationDate: new Date('1999-12-07'),
    directors: ['Philip Besiimire (Managing Director)', 'Judge (Rtd) Thomas Mihayo (Chairman)'],
    address: 'Vodacom Tower, Ursino Estate, Plot 23, Bagamoyo Road, P.O. Box 2369, Dar es Salaam, Tanzania',
  },
  {
    name: 'CRDB Bank PLC',
    registrationNumber: 'TZ-BRELA-14920',
    countryCode: 'TZ',
    typeName: 'Public Limited Company (PLC)',
    typeDescription: 'Public company listed on the Dar es Salaam Stock Exchange.',
    status: 'active',
    registrationDate: new Date('1996-07-01'),
    directors: ['Abdulmajid Nsekela (Group CEO & MD)', 'Dr. Ally Laay (Board Chairman)'],
    address: 'CRDB Head Office, Plot No. 25 & 26, Ali Hassan Mwinyi Road, Dar es Salaam, Tanzania',
  },
  {
    name: 'NMB Bank PLC',
    registrationNumber: 'TZ-BRELA-39201',
    countryCode: 'TZ',
    typeName: 'Public Limited Company (PLC)',
    typeDescription: 'Public company listed on the Dar es Salaam Stock Exchange.',
    status: 'active',
    registrationDate: new Date('1997-09-08'),
    directors: ['Ruth Zaipuna (CEO)', 'Dr. Edwin Mhede (Board Chairman)'],
    address: 'NMB Head Office, Ohio/Ali Hassan Mwinyi Road, P.O. Box 9213, Dar es Salaam, Tanzania',
  },
  {
    name: 'Medical Stores Department (MSD)',
    registrationNumber: 'STAT/TZ/1993/MSD',
    countryCode: 'TZ',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'Autonomous government agency established under Act of Parliament.',
    status: 'active',
    registrationDate: new Date('1993-07-01'),
    directors: ['Mavere Tukai (Director General)', 'Rosemary Silaa (Board Chair)'],
    address: 'Keko Mwanga, Off Nyerere Road, P.O. Box 9081, Dar es Salaam, Tanzania',
  },
  {
    name: 'Tanzania Revenue Authority (TRA)',
    registrationNumber: 'STAT/TZ/1995/TRA',
    countryCode: 'TZ',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'Autonomous government agency established under Act of Parliament.',
    status: 'active',
    registrationDate: new Date('1995-07-01'),
    directors: ['Alphayo Kidata (Commissioner General)', 'Uledi Msuya (Board Chair)'],
    address: 'TRA Head Office, Samora Avenue, P.O. Box 11491, Dar es Salaam, Tanzania',
  },
  {
    name: 'Bakhresa Group (SSB Ltd)',
    registrationNumber: 'TZ-BRELA-04821',
    countryCode: 'TZ',
    typeName: 'Private Limited Company (Ltd)',
    typeDescription: 'Privately held commercial enterprise with limited shareholder liability.',
    status: 'active',
    registrationDate: new Date('1983-05-18'),
    directors: ['Said Salim Bakhresa (Founder & Chairman)', 'Abubakar Bakhresa (Managing Director)'],
    address: 'Vingunguti Industrial Area, Nyerere Road, P.O. Box 2517, Dar es Salaam, Tanzania',
  },

  // Uganda (UG)
  {
    name: 'MTN Uganda Limited',
    registrationNumber: 'UG-URSB-36912',
    countryCode: 'UG',
    typeName: 'Public Limited Company (PLC)',
    typeDescription: 'Public company listed on the Uganda Securities Exchange.',
    status: 'active',
    registrationDate: new Date('1998-02-25'),
    directors: ['Sylvia Mulinge (CEO)', 'Charles Mbire (Board Chairman)', 'Yolanda Cuba'],
    address: 'MTN Towers, Plot 69-71 Jinja Road, P.O. Box 24624, Kampala, Uganda',
  },
  {
    name: 'Stanbic Bank Uganda Limited',
    registrationNumber: 'UG-URSB-09418',
    countryCode: 'UG',
    typeName: 'Public Limited Company (PLC)',
    typeDescription: 'Public company listed on the Uganda Securities Exchange.',
    status: 'active',
    registrationDate: new Date('1906-08-01'),
    directors: ['Anne Juuko (Chief Executive)', 'Japheth Katto (Board Chairman)'],
    address: 'Crested Towers, 17 Hannington Road, P.O. Box 7131, Kampala, Uganda',
  },
  {
    name: 'National Medical Stores (NMS)',
    registrationNumber: 'STAT/UG/1993/NMS',
    countryCode: 'UG',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'Autonomous government agency established under Act of Parliament.',
    status: 'active',
    registrationDate: new Date('1993-12-03'),
    directors: ['Moses Kamabare (General Manager)', 'Dr. Jotham Musinguzi (Board Chairman)'],
    address: 'Plot 4-12 Nsamizi Road, P.O. Box 16, Entebbe, Uganda',
  },
  {
    name: 'Uganda Revenue Authority (URA)',
    registrationNumber: 'STAT/UG/1991/URA',
    countryCode: 'UG',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'Autonomous government agency established under Act of Parliament.',
    status: 'active',
    registrationDate: new Date('1991-09-05'),
    directors: ['John Musinguzi Rujoki (Commissioner General)', 'Juma Kisaame (Board Chairman)'],
    address: 'URA Tower, Plot M193/M194 Nakawa Industrial Area, P.O. Box 7279, Kampala, Uganda',
  },

  // Rwanda (RW)
  {
    name: 'MTN Rwandacell PLC',
    registrationNumber: 'RW-RDB-100004910',
    countryCode: 'RW',
    typeName: 'Public Limited Company (PLC)',
    typeDescription: 'Public company listed on the Rwanda Stock Exchange.',
    status: 'active',
    registrationDate: new Date('1998-05-15'),
    directors: ['Mapula Bodibe (CEO)', 'Faustin Mbundu (Board Chairman)'],
    address: 'MTN Center Nyarutarama, KG 9 Ave, P.O. Box 264, Kigali, Rwanda',
  },
  {
    name: 'Bank of Kigali Group PLC',
    registrationNumber: 'RW-RDB-100003491',
    countryCode: 'RW',
    typeName: 'Public Limited Company (PLC)',
    typeDescription: 'Public company listed on the Rwanda Stock Exchange.',
    status: 'active',
    registrationDate: new Date('1966-12-22'),
    directors: ['Diane Karusisi (CEO)', 'Marc Holtzman (Board Chairman)'],
    address: 'Plot 6112, Avenue de la Paix, P.O. Box 175, Kigali, Rwanda',
  },
  {
    name: 'Rwanda Medical Supply Ltd (RMS)',
    registrationNumber: 'RW-RDB-109283742',
    countryCode: 'RW',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'State-owned pharmaceutical distribution corporation.',
    status: 'active',
    registrationDate: new Date('2020-03-01'),
    directors: ['Pie Harerimana (CEO)', 'Dr. Daniel Ngamije'],
    address: 'KG 17 Ave, Kanombe, Kicukiro, Kigali, Rwanda',
  },
  {
    name: 'Rwanda Development Board (RDB)',
    registrationNumber: 'STAT/RW/2008/RDB',
    countryCode: 'RW',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'Government agency mandated to accelerate Rwanda economic development.',
    status: 'active',
    registrationDate: new Date('2008-09-01'),
    directors: ['Francis Gatare (CEO)', 'Itzhak Fisher (Board Chairman)'],
    address: 'KN 67 Street, Gishushu, P.O. Box 6239, Kigali, Rwanda',
  },

  // Ethiopia (ET)
  {
    name: 'Ethio Telecom',
    registrationNumber: 'ET-MINT-001294',
    countryCode: 'ET',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'State-owned national telecommunications carrier.',
    status: 'active',
    registrationDate: new Date('1894-01-01'),
    directors: ['Frehiwot Tamru (CEO)', 'Ahmed Shide (Board Chairman)'],
    address: 'Churchill Road, P.O. Box 1047, Addis Ababa, Ethiopia',
  },
  {
    name: 'Commercial Bank of Ethiopia (CBE)',
    registrationNumber: 'ET-NBE-0001',
    countryCode: 'ET',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'State-owned commercial bank.',
    status: 'active',
    registrationDate: new Date('1942-04-15'),
    directors: ['Abe Sano (President & CEO)', 'Ahmed Shide (Board Chairman)'],
    address: 'CBE New Headquarters, Ras Desta Damtew Street, P.O. Box 255, Addis Ababa, Ethiopia',
  },
  {
    name: 'Ethiopian Pharmaceuticals Supply Agency (EPSA)',
    registrationNumber: 'STAT/ET/2007/EPSA',
    countryCode: 'ET',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'Government agency procuring and distributing vital pharmaceuticals.',
    status: 'active',
    registrationDate: new Date('2007-07-01'),
    directors: ['Dr. Abdulkadir Gelgelo (Director General)'],
    address: 'In front of St. Paul Hospital, P.O. Box 22463, Addis Ababa, Ethiopia',
  },

  // DRC (CD)
  {
    name: 'Vodacom Congo RDC SA',
    registrationNumber: 'CD-RCCM-01-B-0391',
    countryCode: 'CD',
    typeName: 'Société Anonyme (SA)',
    typeDescription: 'Public limited liability commercial entity under OHADA law.',
    status: 'active',
    registrationDate: new Date('2001-10-24'),
    directors: ['Khalil-Al-Americani (Managing Director)'],
    address: 'Immeuble Vodacom, Boulevard du 30 Juin, Gombe, Kinshasa, DRC',
  },
  {
    name: 'Rawbank SA',
    registrationNumber: 'CD-RCCM-14-B-1284',
    countryCode: 'CD',
    typeName: 'Société Anonyme (SA)',
    typeDescription: 'Commercial banking corporation governed by OHADA corporate law.',
    status: 'active',
    registrationDate: new Date('2002-05-02'),
    directors: ['Mustafa Rawji (Managing Director)', 'Mazhar Rawji (Chairman)'],
    address: '3487 Boulevard du 30 Juin, Gombe, Kinshasa, DRC',
  },
  {
    name: 'Société Nationale d’Électricité (SNEL SA)',
    registrationNumber: 'CD-RCCM-14-B-0082',
    countryCode: 'CD',
    typeName: 'State Corporation / Statutory Authority',
    typeDescription: 'National electricity utility and public infrastructure operator.',
    status: 'active',
    registrationDate: new Date('1970-05-16'),
    directors: ['Fabrice Lusinde (Director General)'],
    address: 'Avenue de la Justice, Commune de la Gombe, Kinshasa, DRC',
  },
];

async function seed() {
  console.log('Seeding business registry entities across East Africa...');

  // 1. Fetch or create countries map
  const existingCountries = await db.select().from(countries);
  const countryCodeMap = new Map<string, string>();
  for (const c of existingCountries) {
    countryCodeMap.set(c.code.toUpperCase(), c.id);
  }

  // Ensure default country codes if needed
  const requiredCodes: [string, string][] = [
    ['KE', 'Kenya'],
    ['TZ', 'Tanzania'],
    ['UG', 'Uganda'],
    ['RW', 'Rwanda'],
    ['ET', 'Ethiopia'],
    ['CD', 'Democratic Republic of the Congo'],
  ];

  for (const [code, name] of requiredCodes) {
    if (!countryCodeMap.has(code)) {
      const inserted = await db.insert(countries).values({ code, name }).returning();
      countryCodeMap.set(code, inserted[0].id);
      console.log(`Inserted country: ${name} (${code})`);
    }
  }

  // 2. Fetch or create business types
  const existingTypes = await db.select().from(businessTypes);
  const typeMap = new Map<string, string>();
  for (const t of existingTypes) {
    typeMap.set(t.name, t.id);
  }

  // 3. Insert businesses
  let insertedCount = 0;

  for (const item of SEED_DATA) {
    const countryId = countryCodeMap.get(item.countryCode.toUpperCase());
    if (!countryId) {
      console.error(`Country code ${item.countryCode} not found in DB!`);
      continue;
    }

    // Ensure business type exists
    let typeId = typeMap.get(item.typeName);
    if (!typeId) {
      const [newType] = await db
        .insert(businessTypes)
        .values({
          name: item.typeName,
          description: item.typeDescription,
          countryId,
        })
        .onConflictDoUpdate({
          target: businessTypes.name,
          set: { description: item.typeDescription },
        })
        .returning();
      typeId = newType.id;
      typeMap.set(item.typeName, typeId);
    }

    // Insert or update business record
    const result = await db
      .insert(businesses)
      .values({
        registrationNumber: item.registrationNumber,
        name: item.name,
        typeId,
        countryId,
        status: item.status,
        registrationDate: item.registrationDate,
        directors: item.directors,
        address: item.address,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: businesses.registrationNumber,
        set: {
          name: item.name,
          typeId,
          countryId,
          status: item.status,
          registrationDate: item.registrationDate,
          directors: item.directors,
          address: item.address,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (result.length > 0) {
      insertedCount++;
    }
  }

  console.log(`Successfully seeded ${insertedCount} registered businesses across East Africa!`);
  await client.end();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error('Error seeding businesses:', err);
  await client.end();
  process.exit(1);
});
