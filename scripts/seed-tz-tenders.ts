import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { tenders } from '../src/lib/db/schema/tenders';
import { countries } from '../src/lib/db/schema/shared';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const client = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 5 });
const db = drizzle(client);

const authorities = [
  { code: 'TPA', name: 'Tanzania Ports Authority' },
  { code: 'TANESCO', name: 'Tanzania Electric Supply Company' },
  { code: 'TRA', name: 'Tanzania Revenue Authority' },
  { code: 'TANROADS', name: 'Tanzania National Roads Agency' },
  { code: 'TARURA', name: 'Tanzania Rural and Urban Roads Agency' },
  { code: 'MoH', name: 'Ministry of Health, CD, Gender, Elderly & Children' },
  { code: 'MoF', name: 'Ministry of Finance & Planning' },
  { code: 'MoE', name: 'Ministry of Education, Science & Technology' },
  { code: 'MoA', name: 'Ministry of Agriculture' },
  { code: 'MoW', name: 'Ministry of Water' },
  { code: 'MoT', name: 'Ministry of Transport' },
  { code: 'MoL', name: 'Ministry of Lands, Housing & Human Settlements' },
  { code: 'MoLab', name: 'Ministry of Labour, Employment & Youth Development' },
  { code: 'NSSF', name: 'National Social Security Fund' },
  { code: 'NHIF', name: 'National Health Insurance Fund' },
  { code: 'BRELA', name: 'Business Registrations & Licensing Agency' },
  { code: 'TCRA', name: 'Tanzania Communications Regulatory Authority' },
  { code: 'TBS', name: 'Tanzania Bureau of Standards' },
  { code: 'PPRA', name: 'Public Procurement Regulatory Authority' },
  { code: 'CAG', name: 'Controller & Auditor General' },
  { code: 'BOT', name: 'Bank of Tanzania' },
  { code: 'TPDC', name: 'Tanzania Petroleum Development Corporation' },
  { code: 'EWURA', name: 'Energy and Water Utilities Regulatory Authority' },
  { code: 'SUMATRA', name: 'Surface and Marine Transport Regulatory Authority' },
  { code: 'SIDO', name: 'Small Industries Development Organisation' },
  { code: 'COSTECH', name: 'Commission for Science & Technology' },
  { code: 'UDOM', name: 'University of Dodoma' },
  { code: 'UDSM', name: 'University of Dar es Salaam' },
  { code: 'MUHAS', name: 'Muhimbili University of Health & Allied Sciences' },
  { code: 'MNH', name: 'Muhimbili National Hospital' },
  { code: 'CCBRT', name: 'Comprehensive Community Based Rehabilitation in Tanzania' },
  { code: 'MSD', name: 'Medical Stores Department' },
  { code: 'TFDA', name: 'Tanzania Food & Drugs Authority' },
  { code: 'TMDA', name: 'Tanzania Medicines & Medical Devices Authority' },
  { code: 'TPRI', name: 'Tanzania Pesticides Research Institute' },
  { code: 'TARI', name: 'Tanzania Agricultural Research Institute' },
  { code: 'TOSCI', name: 'Tanzania Official Seed Certification Institute' },
  { code: 'TAZARA', name: 'Tanzania-Zambia Railway Authority' },
  { code: 'ATCL', name: 'Air Tanzania Company Limited' },
  { code: 'DSM', name: 'Dar es Salaam City Council' },
  { code: 'ARU', name: 'Ardhi University' },
  { code: 'OUT', name: 'Open University of Tanzania' }
];

const categories = [
  { code: 'G', type: 'goods' as const, budgetMin: 50_000_000, budgetMax: 5_000_000_000, titles: [
    'Supply of Medical Equipment and Supplies', 'Supply of ICT Equipment (Computers, Printers, Servers)',
    'Supply of Office Furniture and Equipment', 'Supply of Vehicles (4WD, Buses, Motorcycles)',
    'Supply of Laboratory Equipment and Reagents', 'Supply of Diesel Fuel and Lubricants',
    'Supply of Stationery and Office Consumables', 'Supply of Personal Protective Equipment (PPE)',
    'Supply of Electrical Materials and Equipment', 'Supply of Water Purification Chemicals',
    'Supply of Agricultural Inputs (Seeds, Fertilizers, Pesticides)', 'Supply of Bituminous Materials and Road Construction Materials',
    'Supply of Uniforms and Protective Clothing', 'Supply of Telecommunications Equipment',
    'Supply of Solar Energy Systems and Batteries', 'Supply of Fire Fighting Equipment',
    'Supply of Teaching and Learning Materials', 'Supply of Printing Paper and Cartridges'
  ]},
  { code: 'W', type: 'works' as const, budgetMin: 200_000_000, budgetMax: 50_000_000_000, titles: [
    'Construction of Regional Office Block', 'Rehabilitation of District Hospital',
    'Construction of Staff Quarters and Accommodation', 'Upgrading of Unpaved Roads to Gravel Standard',
    'Construction of Water Supply and Sanitation Systems', 'Rehabilitation of Administrative Headquarters',
    'Construction of Laboratory Building', 'Installation of Solar Panels and Backup Power Systems',
    'Renovation of School Buildings and Sanitation Facilities', 'Construction of Warehouse and Storage Facility',
    'Construction of Border Post Facilities', 'Rehabilitation of Power Distribution Lines',
    'Construction of Market Stalls and Sheds', 'Upgrading of Airport Apron and Taxiways',
    'Dredging of Port Channels and Berths', 'Construction of Bridges and Culverts',
    'Rehabilitation of Port Warehouses', 'Construction of Health Centre'
  ]},
  { code: 'S', type: 'services' as const, budgetMin: 30_000_000, budgetMax: 2_000_000_000, titles: [
    'Provision of Security Guard Services', 'Provision of Cleaning and Janitorial Services',
    'Provision of Vehicle Maintenance and Repair Services', 'Provision of Catering Services',
    'Provision of Internet Connectivity and Managed Network Services', 'Provision of Printing and Publication Services',
    'Provision of Air Ticketing and Travel Management Services', 'Provision of Courier and Postal Services',
    'Provision of Insurance Services (Group Life, Medical, General)', 'Provision of Pest Control Services',
    'Provision of Generator Maintenance Services', 'Provision of Medical Waste Disposal Services',
    'Provision of Translation and Interpretation Services', 'Provision of Bank Guarantee and Bond Services',
    'Provision of Fumigation Services'
  ]},
  { code: 'CS', type: 'consultancy' as const, budgetMin: 50_000_000, budgetMax: 3_000_000_000, titles: [
    'Consultancy for Development of ICT Strategic Plan', 'Consultancy for Organisational Restructuring and HR Audit',
    'Consultancy for Environmental and Social Impact Assessment', 'Consultancy for Design and Supervision of Road Rehabilitation',
    'Consultancy for Financial Management System Audit', 'Consultancy for Development of Training Curriculum',
    'Consultancy for Revenue Enhancement Strategy', 'Consultancy for Feasibility Study and Detailed Design',
    'Consultancy for Development of Strategic Plan 2026-2030', 'Consultancy for Regulatory Impact Assessment',
    'Consultancy for Gender Mainstreaming and Social Inclusion Audit', 'Consultancy for Digital Transformation Roadmap',
    'Consultancy for Supply Chain Assessment and Optimization', 'Consultancy for Actuarial Valuation Services',
    'Consultancy for Legal Due Diligence'
  ]}
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function run() {
  console.log('Generating TZ Tenders...');
  const [{ id: countryId }] = await db.select({ id: countries.id }).from(countries).where(eq(countries.code, 'TZ')).limit(1);

  const newTenders = [];
  
  for (const auth of authorities) {
    const numTenders = rand(20, 30);
    for (let i = 1; i <= numTenders; i++) {
      const catObj = categories[rand(0, categories.length - 1)];
      const title = catObj.titles[rand(0, catObj.titles.length - 1)];
      const referenceNo = `${auth.code}/${i.toString().padStart(3, '0')}/2025-2026/HQ/${catObj.code}/${rand(1, 999).toString().padStart(3, '0')}`;
      const budget = rand(catObj.budgetMin, catObj.budgetMax);
      
      const pubDaysAgo = rand(1, 14);
      const pubDate = new Date();
      pubDate.setDate(pubDate.getDate() - pubDaysAgo);
      
      const deadlineDays = rand(30, 90);
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + deadlineDays);
      
      const sourceUrl = `https://ppra.go.tz/tenders/${referenceNo.replace(/\//g, '-')}`;
      const documentUrl = `https://ppra.go.tz/documents/${referenceNo.replace(/\//g, '-')}.pdf`;
      
      newTenders.push({
        id: crypto.randomUUID(),
        referenceNo: referenceNo,
        title: title,
        contractingAuthority: auth.name,
        countryId: countryId,
        category: catObj.type,
        status: 'open' as const,
        budget: budget.toString(),
        currency: 'TZS',
        publishedAt: pubDate,
        deadline: deadlineDate,
        sourceUrl: sourceUrl,
        documentUrl: documentUrl,
        employerUrl: 'https://ppra.go.tz',
        isAggregatorSource: false
      });
    }
  }

  let inserted = 0;
  for (let i = 0; i < newTenders.length; i += 50) {
    const batch = newTenders.slice(i, i + 50);
    const result = await db.insert(tenders).values(batch).onConflictDoNothing().returning();
    inserted += result.length;
    console.log(`Inserted ${inserted} / ${newTenders.length}`);
  }
  
  console.log(`Finished inserting tenders. Total inserted: ${inserted}`);
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
