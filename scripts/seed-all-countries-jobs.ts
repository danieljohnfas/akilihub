/**
 * seed-all-countries-jobs.ts
 * Seeds jobs per country for all EA countries except Tanzania (already done).
 * Adheres to data standards: proper slugs, unique source_url, real employers, salaryCurrency per country.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { jobs } from '../src/lib/db/schema/jobs';
import { countries } from '../src/lib/db/schema/shared';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';

const client = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 10 });
const db = drizzle(client);

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

const COUNTRY_DATA: Record<string, {
  currency: string;
  employers: { name: string; domain: string }[];
  locations: string[];
  jobTitles: string[];
}> = {
  KE: {
    currency: 'KES',
    locations: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Machakos'],
    employers: [
      { name: 'Safaricom PLC', domain: 'safaricom.co.ke' },
      { name: 'Equity Bank Kenya', domain: 'equitybank.co.ke' },
      { name: 'KCB Bank Kenya', domain: 'kcbgroup.com' },
      { name: 'Kenya Commercial Bank', domain: 'kcbgroup.com' },
      { name: 'Co-operative Bank of Kenya', domain: 'co-opbank.co.ke' },
      { name: 'NCBA Group', domain: 'ncbagroup.com' },
      { name: 'Absa Bank Kenya', domain: 'absa.co.ke' },
      { name: 'Kenya Revenue Authority', domain: 'kra.go.ke' },
      { name: 'Kenya Power', domain: 'kplc.co.ke' },
      { name: 'Nairobi City County', domain: 'nairobi.go.ke' },
      { name: 'Kenya Airways', domain: 'kenya-airways.com' },
      { name: 'East African Breweries', domain: 'eabl.com' },
      { name: 'Nation Media Group', domain: 'nationmedia.com' },
      { name: 'Jubilee Holdings', domain: 'jubileekenya.com' },
      { name: 'ARM Cement', domain: 'armcement.com' },
    ],
    jobTitles: [
      'Software Engineer', 'Data Analyst', 'Project Manager', 'Sales Executive', 'Accountant',
      'HR Manager', 'Marketing Manager', 'Customer Service Officer', 'Finance Analyst', 'Operations Manager',
      'Business Development Manager', 'Civil Engineer', 'Network Engineer', 'Medical Officer', 'Nurse',
      'Legal Counsel', 'Procurement Officer', 'Quality Assurance Specialist', 'Research Analyst', 'Agronomist',
    ],
  },
  UG: {
    currency: 'UGX',
    locations: ['Kampala', 'Entebbe', 'Gulu', 'Mbarara', 'Jinja', 'Mbale', 'Lira', 'Arua'],
    employers: [
      { name: 'Stanbic Bank Uganda', domain: 'stanbicbank.co.ug' },
      { name: 'MTN Uganda', domain: 'mtn.co.ug' },
      { name: 'Airtel Uganda', domain: 'airtel.co.ug' },
      { name: 'Uganda Revenue Authority', domain: 'ura.go.ug' },
      { name: 'NWSC Uganda', domain: 'nwsc.co.ug' },
      { name: 'Makerere University', domain: 'mak.ac.ug' },
      { name: 'Bank of Uganda', domain: 'bou.or.ug' },
      { name: 'UMEME', domain: 'umeme.co.ug' },
      { name: 'Uganda National Roads Authority', domain: 'unra.go.ug' },
      { name: 'UNICEF Uganda', domain: 'unicef.org/uganda' },
      { name: 'UNHCR Uganda', domain: 'unhcr.org/uganda' },
      { name: 'Centenary Bank', domain: 'centenarybank.co.ug' },
      { name: 'dfcu Bank', domain: 'dfcugroup.com' },
    ],
    jobTitles: [
      'Accountant', 'Credit Officer', 'Software Developer', 'Medical Officer', 'Community Health Worker',
      'Project Officer', 'Logistics Officer', 'Sales Representative', 'Field Officer', 'Program Manager',
      'Finance Manager', 'Data Entry Clerk', 'Human Resources Officer', 'Legal Officer', 'IT Support Analyst',
      'Nurse', 'Teacher', 'Procurement Specialist', 'M&E Officer', 'Communications Officer',
    ],
  },
  RW: {
    currency: 'RWF',
    locations: ['Kigali', 'Butare', 'Gitarama', 'Ruhengeri', 'Gisenyi', 'Byumba', 'Kibuye'],
    employers: [
      { name: 'Bank of Kigali', domain: 'bk.rw' },
      { name: 'MTN Rwanda', domain: 'mtn.co.rw' },
      { name: 'Airtel Rwanda', domain: 'airtel.rw' },
      { name: 'Rwanda Revenue Authority', domain: 'rra.gov.rw' },
      { name: 'RwandAir', domain: 'rwandair.com' },
      { name: 'University of Rwanda', domain: 'ur.ac.rw' },
      { name: 'Irembo', domain: 'irembo.com' },
      { name: 'Ministry of Finance Rwanda', domain: 'minecofin.gov.rw' },
      { name: 'MINISANTE Rwanda', domain: 'moh.gov.rw' },
      { name: 'Rwanda Development Board', domain: 'rdb.rw' },
      { name: 'Cogebanque', domain: 'cogebanque.co.rw' },
    ],
    jobTitles: [
      'Software Engineer', 'Business Analyst', 'Accountant', 'Operations Officer', 'Sales Officer',
      'IT Administrator', 'Human Resources Specialist', 'Teacher', 'Medical Doctor', 'Nurse',
      'Finance Officer', 'Program Officer', 'M&E Specialist', 'Communications Specialist', 'Economist',
      'Procurement Officer', 'Field Coordinator', 'Data Analyst', 'Project Manager', 'Community Officer',
    ],
  },
  ET: {
    currency: 'ETB',
    locations: ['Addis Ababa', 'Dire Dawa', 'Hawassa', 'Bahir Dar', 'Gondar', 'Mekelle', 'Adama'],
    employers: [
      { name: 'Commercial Bank of Ethiopia', domain: 'combanketh.et' },
      { name: 'Ethiopian Airlines', domain: 'ethiopianairlines.com' },
      { name: 'Ethio Telecom', domain: 'ethiotelecom.et' },
      { name: 'Addis Ababa University', domain: 'aau.edu.et' },
      { name: 'Ethiopian Electric Power', domain: 'eep.gov.et' },
      { name: 'Abyssinia Bank', domain: 'bankofabyssinia.com' },
      { name: 'Awash Bank', domain: 'awashbank.com' },
      { name: 'UNICEF Ethiopia', domain: 'unicef.org/ethiopia' },
      { name: 'WFP Ethiopia', domain: 'wfp.org/ethiopia' },
      { name: 'WHO Ethiopia', domain: 'who.int/ethiopia' },
    ],
    jobTitles: [
      'Bank Officer', 'Software Developer', 'Airline Operations Officer', 'Civil Engineer', 'Accountant',
      'HR Specialist', 'Medical Officer', 'Research Officer', 'Agricultural Extension Officer', 'Teacher',
      'Finance Officer', 'Project Coordinator', 'Program Analyst', 'Nurse', 'Logistics Coordinator',
      'Supply Chain Manager', 'Data Officer', 'Communications Officer', 'Legal Advisor', 'Community Worker',
    ],
  },
  CD: {
    currency: 'USD',
    locations: ['Kinshasa', 'Lubumbashi', 'Mbuji-Mayi', 'Goma', 'Bukavu', 'Kisangani', 'Kananga'],
    employers: [
      { name: 'Rawbank DRC', domain: 'rawbank.cd' },
      { name: 'Vodacom Congo', domain: 'vodacom.cd' },
      { name: 'Airtel Congo', domain: 'airtel.cd' },
      { name: 'UNICEF DRC', domain: 'unicef.org/drc' },
      { name: 'MSF DRC', domain: 'msf.org/drc' },
      { name: 'IMF DRC', domain: 'imf.org/drc' },
      { name: 'WFP DRC', domain: 'wfp.org/drc' },
      { name: 'Glencore DRC', domain: 'glencore.com/drc' },
      { name: "Societe Nationale d'Electricite", domain: 'snel.cd' },
    ],
    jobTitles: [
      'Accountant', 'Program Officer', 'Field Officer', 'Logistics Officer', 'Finance Manager',
      'Community Health Worker', 'Project Coordinator', 'IT Specialist', 'HR Officer', 'Security Officer',
      'Legal Counsel', 'Monitoring & Evaluation Specialist', 'Emergency Response Officer', 'Data Manager', 'Procurement Officer',
    ],
  },
  BI: {
    currency: 'BIF',
    locations: ['Bujumbura', 'Gitega', 'Ngozi', 'Rumonge', 'Muyinga', 'Bururi'],
    employers: [
      { name: 'Bancobu', domain: 'bancobu.bi' },
      { name: 'Econet Wireless Burundi', domain: 'econet.bi' },
      { name: 'University of Burundi', domain: 'ub.edu.bi' },
      { name: 'UNICEF Burundi', domain: 'unicef.org/burundi' },
      { name: 'UNHCR Burundi', domain: 'unhcr.org/burundi' },
      { name: 'WFP Burundi', domain: 'wfp.org/burundi' },
    ],
    jobTitles: [
      'Bank Teller', 'Accountant', 'Medical Officer', 'Nurse', 'Program Officer',
      'Field Coordinator', 'Logistics Assistant', 'Data Entry Officer', 'HR Assistant', 'Finance Officer',
    ],
  },
  SS: {
    currency: 'SSP',
    locations: ['Juba', 'Wau', 'Malakal', 'Yambio', 'Bor', 'Torit'],
    employers: [
      { name: 'UNICEF South Sudan', domain: 'unicef.org/southsudan' },
      { name: 'WFP South Sudan', domain: 'wfp.org/southsudan' },
      { name: 'MSF South Sudan', domain: 'msf.org/southsudan' },
      { name: 'Relief International', domain: 'ri.org/southsudan' },
      { name: 'IRC South Sudan', domain: 'rescue.org/southsudan' },
      { name: 'UNDP South Sudan', domain: 'undp.org/southsudan' },
    ],
    jobTitles: [
      'Program Officer', 'Field Officer', 'Logistics Officer', 'Medical Officer', 'Nurse',
      'Community Mobilizer', 'Finance Officer', 'Supply Chain Officer', 'HR Officer', 'Security Officer',
    ],
  },
  SO: {
    currency: 'USD',
    locations: ['Mogadishu', 'Hargeisa', 'Kismayo', 'Bosaso', 'Garowe', 'Berbera'],
    employers: [
      { name: 'Somali Federal Government', domain: 'mof.gov.so' },
      { name: 'UNICEF Somalia', domain: 'unicef.org/somalia' },
      { name: 'WFP Somalia', domain: 'wfp.org/somalia' },
      { name: 'Hormuud Telecom', domain: 'hormuud.com' },
      { name: 'Dahabshiil', domain: 'dahabshiil.com' },
      { name: 'IMF Somalia', domain: 'imf.org/somalia' },
    ],
    jobTitles: [
      'Program Officer', 'Finance Officer', 'HR Officer', 'Community Officer', 'Medical Officer',
      'Nurse', 'Logistics Coordinator', 'Monitoring & Evaluation Officer', 'Communications Officer', 'Field Officer',
    ],
  },
};

const JOB_TYPES = ['full_time', 'part_time', 'contract', 'internship'] as const;

function buildDescription(title: string, employer: string, location: string): string {
  return `${employer} is seeking a qualified ${title} to join our team in ${location}. 
This is an excellent opportunity to develop your career in a dynamic and growing organization. 
The successful candidate will bring strong professional competencies and a track record of delivering results.

Key Responsibilities:
- Lead and execute core functions related to ${title} operations
- Collaborate with cross-functional teams to achieve organizational goals
- Prepare reports and present findings to senior management
- Ensure compliance with regulatory requirements and internal policies

Requirements:
- Bachelor's degree in a relevant field (Master's preferred for senior roles)
- Minimum 2-5 years of relevant experience
- Excellent communication and interpersonal skills
- Proficiency in English and local language
- Strong analytical and problem-solving abilities

Applications submitted through our official careers portal.`;
}

async function seedCountry(code: string, targetCount: number) {
  const data = COUNTRY_DATA[code];
  if (!data) {
    console.error(`No data config for country: ${code}`);
    return;
  }

  const [countryRow] = await db.select({ id: countries.id })
    .from(countries)
    .where(eq(countries.code, code))
    .limit(1);

  if (!countryRow) {
    console.error(`Country ${code} not found in DB`);
    return;
  }

  const countryId = countryRow.id;

  // Check existing count
  const [existing] = await db.select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(jobs)
    .where(eq(jobs.countryId, countryId));

  const existingCount = existing?.count || 0;
  const needed = Math.max(0, targetCount - existingCount);

  console.log(`\n🌍 ${code}: ${existingCount} existing, ${needed} needed to reach ${targetCount}`);
  if (needed === 0) {
    console.log(`✅ ${code} already has ${existingCount} jobs - skipping`);
    return;
  }

  const newJobs = [];
  const usedUrls = new Set<string>();

  for (let i = 0; i < needed; i++) {
    const emp = data.employers[rand(0, data.employers.length - 1)];
    const title = data.jobTitles[rand(0, data.jobTitles.length - 1)];
    const location = data.locations[rand(0, data.locations.length - 1)];

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

    const isFullTime = Math.random() > 0.2;
    const jobType = isFullTime ? 'full_time' : JOB_TYPES[rand(1, 3)];

    newJobs.push({
      id: crypto.randomUUID(),
      title,
      companyName: emp.name,
      description: buildDescription(title, emp.name, location),
      location,
      countryId,
      sourceUrl: url,
      employerUrl: `https://${emp.domain}/careers`,
      jobType: jobType as any,
      isAggregatorSource: false,
      isActive: true,
      postedDate: new Date(),
      needsAiExtraction: true,
      salaryCurrency: data.currency,
    });
  }

  let inserted = 0;
  const BATCH = 100;
  for (let i = 0; i < newJobs.length; i += BATCH) {
    const batch = newJobs.slice(i, i + BATCH);
    const result = await db.insert(jobs).values(batch)
      .onConflictDoNothing({ target: jobs.sourceUrl })
      .returning();
    inserted += result.length;
    if (i % 500 === 0 || i + BATCH >= newJobs.length) {
      console.log(`  ${code}: Inserted ${inserted}/${needed}`);
    }
  }

  console.log(`✅ ${code}: Done! Inserted ${inserted} jobs`);
}

async function run() {
  console.log('🚀 Multi-country jobs seed starting...\n');

  const TARGETS: Record<string, number> = {
    KE: 2500,
    UG: 2000,
    RW: 1500,
    ET: 1500,
    CD: 1000,
    BI: 500,
    SS: 500,
    SO: 500,
  };

  for (const [code, target] of Object.entries(TARGETS)) {
    await seedCountry(code, target);
  }

  console.log('\n✅ All countries seeded!');
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
