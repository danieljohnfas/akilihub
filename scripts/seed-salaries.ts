/**
 * Seed ~40 realistic salary submissions for East African professionals.
 * Run with: npx tsx scripts/seed-salaries.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');

type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'executive';
type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'consultancy';

interface SalaryRow {
  job_title: string;
  job_category_id: string | null;
  employer_id: null;
  country_id: string;
  experience_level: ExperienceLevel;
  employment_type: EmploymentType;
  currency: string;
  gross_monthly_salary: number;
  net_monthly_salary: number;
  years_of_experience: number;
  is_anonymous: boolean;
  is_verified: boolean;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

async function main() {
  console.log('🌱 Seeding salary submissions...\n');

  // Look up country IDs
  const countryRows = await sql<{ code: string; id: string }[]>`
    SELECT code, id FROM countries WHERE code IN ('KE','TZ','UG','RW')
  `;
  const countryMap: Record<string, string> = {};
  for (const row of countryRows) countryMap[row.code] = row.id;

  const { KE, TZ, UG, RW } = countryMap;
  if (!KE || !TZ || !UG || !RW) {
    console.error('❌ Missing required countries (KE/TZ/UG/RW). Ensure countries are seeded first.');
    process.exit(1);
  }

  // Look up job category IDs (name → id)
  const catRows = await sql<{ name: string; id: string }[]>`
    SELECT name, id FROM job_categories
  `;
  const catMap: Record<string, string> = {};
  for (const row of catRows) catMap[row.name.toLowerCase()] = row.id;

  function catId(name: string): string | null {
    const lower = name.toLowerCase();
    for (const key of Object.keys(catMap)) {
      if (key.includes(lower) || lower.includes(key)) return catMap[key];
    }
    return null;
  }

  const techCat = catId('technology') ?? catId('software') ?? catId('ict') ?? null;
  const financeCat = catId('finance') ?? catId('accounting') ?? null;
  const healthCat = catId('health') ?? catId('medical') ?? null;
  const educationCat = catId('education') ?? catId('teaching') ?? null;
  const procurementCat = catId('procurement') ?? catId('supply') ?? null;
  const managementCat = catId('management') ?? catId('project') ?? null;
  const ngoCat = catId('ngo') ?? catId('development') ?? null;

  const submissions: SalaryRow[] = [
    // ── KENYA ─────────────────────────────────────────────────────────────────
    {
      job_title: 'Software Developer',
      job_category_id: techCat,
      employer_id: null,
      country_id: KE,
      experience_level: 'entry',
      employment_type: 'full_time',
      currency: 'KES',
      gross_monthly_salary: rand(60_000, 100_000),
      net_monthly_salary: 0, // set below
      years_of_experience: rand(0, 2),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Software Developer',
      job_category_id: techCat,
      employer_id: null,
      country_id: KE,
      experience_level: 'mid',
      employment_type: 'full_time',
      currency: 'KES',
      gross_monthly_salary: rand(150_000, 250_000),
      net_monthly_salary: 0,
      years_of_experience: rand(3, 6),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Senior Software Engineer',
      job_category_id: techCat,
      employer_id: null,
      country_id: KE,
      experience_level: 'senior',
      employment_type: 'full_time',
      currency: 'KES',
      gross_monthly_salary: rand(300_000, 500_000),
      net_monthly_salary: 0,
      years_of_experience: rand(7, 12),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Data Analyst',
      job_category_id: techCat,
      employer_id: null,
      country_id: KE,
      experience_level: 'entry',
      employment_type: 'full_time',
      currency: 'KES',
      gross_monthly_salary: rand(50_000, 80_000),
      net_monthly_salary: 0,
      years_of_experience: rand(0, 2),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Data Analyst',
      job_category_id: techCat,
      employer_id: null,
      country_id: KE,
      experience_level: 'mid',
      employment_type: 'full_time',
      currency: 'KES',
      gross_monthly_salary: rand(120_000, 200_000),
      net_monthly_salary: 0,
      years_of_experience: rand(3, 6),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Registered Nurse',
      job_category_id: healthCat,
      employer_id: null,
      country_id: KE,
      experience_level: 'entry',
      employment_type: 'full_time',
      currency: 'KES',
      gross_monthly_salary: rand(30_000, 50_000),
      net_monthly_salary: 0,
      years_of_experience: rand(0, 2),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Registered Nurse',
      job_category_id: healthCat,
      employer_id: null,
      country_id: KE,
      experience_level: 'mid',
      employment_type: 'full_time',
      currency: 'KES',
      gross_monthly_salary: rand(60_000, 100_000),
      net_monthly_salary: 0,
      years_of_experience: rand(3, 7),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Accountant',
      job_category_id: financeCat,
      employer_id: null,
      country_id: KE,
      experience_level: 'entry',
      employment_type: 'full_time',
      currency: 'KES',
      gross_monthly_salary: rand(40_000, 70_000),
      net_monthly_salary: 0,
      years_of_experience: rand(0, 2),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Accountant',
      job_category_id: financeCat,
      employer_id: null,
      country_id: KE,
      experience_level: 'mid',
      employment_type: 'full_time',
      currency: 'KES',
      gross_monthly_salary: rand(100_000, 180_000),
      net_monthly_salary: 0,
      years_of_experience: rand(3, 6),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Senior Accountant',
      job_category_id: financeCat,
      employer_id: null,
      country_id: KE,
      experience_level: 'senior',
      employment_type: 'full_time',
      currency: 'KES',
      gross_monthly_salary: rand(200_000, 350_000),
      net_monthly_salary: 0,
      years_of_experience: rand(7, 14),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Secondary School Teacher',
      job_category_id: educationCat,
      employer_id: null,
      country_id: KE,
      experience_level: 'entry',
      employment_type: 'full_time',
      currency: 'KES',
      gross_monthly_salary: rand(25_000, 45_000),
      net_monthly_salary: 0,
      years_of_experience: rand(0, 2),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Secondary School Teacher',
      job_category_id: educationCat,
      employer_id: null,
      country_id: KE,
      experience_level: 'mid',
      employment_type: 'full_time',
      currency: 'KES',
      gross_monthly_salary: rand(60_000, 100_000),
      net_monthly_salary: 0,
      years_of_experience: rand(4, 9),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Procurement Officer',
      job_category_id: procurementCat,
      employer_id: null,
      country_id: KE,
      experience_level: 'entry',
      employment_type: 'full_time',
      currency: 'KES',
      gross_monthly_salary: rand(45_000, 75_000),
      net_monthly_salary: 0,
      years_of_experience: rand(0, 2),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Procurement Officer',
      job_category_id: procurementCat,
      employer_id: null,
      country_id: KE,
      experience_level: 'mid',
      employment_type: 'full_time',
      currency: 'KES',
      gross_monthly_salary: rand(100_000, 160_000),
      net_monthly_salary: 0,
      years_of_experience: rand(3, 7),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Senior Procurement Manager',
      job_category_id: procurementCat,
      employer_id: null,
      country_id: KE,
      experience_level: 'senior',
      employment_type: 'full_time',
      currency: 'KES',
      gross_monthly_salary: rand(200_000, 320_000),
      net_monthly_salary: 0,
      years_of_experience: rand(8, 15),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Project Manager',
      job_category_id: managementCat,
      employer_id: null,
      country_id: KE,
      experience_level: 'entry',
      employment_type: 'full_time',
      currency: 'KES',
      gross_monthly_salary: rand(70_000, 110_000),
      net_monthly_salary: 0,
      years_of_experience: rand(1, 3),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Project Manager',
      job_category_id: managementCat,
      employer_id: null,
      country_id: KE,
      experience_level: 'mid',
      employment_type: 'full_time',
      currency: 'KES',
      gross_monthly_salary: rand(160_000, 280_000),
      net_monthly_salary: 0,
      years_of_experience: rand(4, 8),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Senior Project Manager',
      job_category_id: managementCat,
      employer_id: null,
      country_id: KE,
      experience_level: 'senior',
      employment_type: 'full_time',
      currency: 'KES',
      gross_monthly_salary: rand(350_000, 550_000),
      net_monthly_salary: 0,
      years_of_experience: rand(9, 16),
      is_anonymous: true,
      is_verified: false,
    },

    // ── TANZANIA ───────────────────────────────────────────────────────────────
    {
      job_title: 'Software Developer',
      job_category_id: techCat,
      employer_id: null,
      country_id: TZ,
      experience_level: 'entry',
      employment_type: 'full_time',
      currency: 'TZS',
      gross_monthly_salary: rand(800_000, 1_500_000),
      net_monthly_salary: 0,
      years_of_experience: rand(0, 2),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Software Developer',
      job_category_id: techCat,
      employer_id: null,
      country_id: TZ,
      experience_level: 'mid',
      employment_type: 'full_time',
      currency: 'TZS',
      gross_monthly_salary: rand(2_000_000, 3_500_000),
      net_monthly_salary: 0,
      years_of_experience: rand(3, 7),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Senior Software Engineer',
      job_category_id: techCat,
      employer_id: null,
      country_id: TZ,
      experience_level: 'senior',
      employment_type: 'full_time',
      currency: 'TZS',
      gross_monthly_salary: rand(4_000_000, 7_000_000),
      net_monthly_salary: 0,
      years_of_experience: rand(7, 13),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Health Data Officer',
      job_category_id: healthCat,
      employer_id: null,
      country_id: TZ,
      experience_level: 'entry',
      employment_type: 'full_time',
      currency: 'TZS',
      gross_monthly_salary: rand(700_000, 1_200_000),
      net_monthly_salary: 0,
      years_of_experience: rand(0, 2),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Health Data Officer',
      job_category_id: healthCat,
      employer_id: null,
      country_id: TZ,
      experience_level: 'mid',
      employment_type: 'full_time',
      currency: 'TZS',
      gross_monthly_salary: rand(1_500_000, 2_500_000),
      net_monthly_salary: 0,
      years_of_experience: rand(3, 7),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Accountant',
      job_category_id: financeCat,
      employer_id: null,
      country_id: TZ,
      experience_level: 'entry',
      employment_type: 'full_time',
      currency: 'TZS',
      gross_monthly_salary: rand(600_000, 1_000_000),
      net_monthly_salary: 0,
      years_of_experience: rand(0, 2),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Accountant',
      job_category_id: financeCat,
      employer_id: null,
      country_id: TZ,
      experience_level: 'mid',
      employment_type: 'full_time',
      currency: 'TZS',
      gross_monthly_salary: rand(1_200_000, 2_000_000),
      net_monthly_salary: 0,
      years_of_experience: rand(3, 7),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Senior Accountant',
      job_category_id: financeCat,
      employer_id: null,
      country_id: TZ,
      experience_level: 'senior',
      employment_type: 'full_time',
      currency: 'TZS',
      gross_monthly_salary: rand(2_500_000, 4_500_000),
      net_monthly_salary: 0,
      years_of_experience: rand(7, 14),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Procurement Officer',
      job_category_id: procurementCat,
      employer_id: null,
      country_id: TZ,
      experience_level: 'entry',
      employment_type: 'full_time',
      currency: 'TZS',
      gross_monthly_salary: rand(800_000, 1_300_000),
      net_monthly_salary: 0,
      years_of_experience: rand(0, 2),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Procurement Officer',
      job_category_id: procurementCat,
      employer_id: null,
      country_id: TZ,
      experience_level: 'mid',
      employment_type: 'consultancy',
      currency: 'TZS',
      gross_monthly_salary: rand(1_500_000, 2_800_000),
      net_monthly_salary: 0,
      years_of_experience: rand(3, 8),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Clinical Officer',
      job_category_id: healthCat,
      employer_id: null,
      country_id: TZ,
      experience_level: 'entry',
      employment_type: 'full_time',
      currency: 'TZS',
      gross_monthly_salary: rand(900_000, 1_500_000),
      net_monthly_salary: 0,
      years_of_experience: rand(0, 2),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Clinical Officer',
      job_category_id: healthCat,
      employer_id: null,
      country_id: TZ,
      experience_level: 'mid',
      employment_type: 'full_time',
      currency: 'TZS',
      gross_monthly_salary: rand(1_800_000, 3_000_000),
      net_monthly_salary: 0,
      years_of_experience: rand(3, 8),
      is_anonymous: true,
      is_verified: false,
    },

    // ── UGANDA ─────────────────────────────────────────────────────────────────
    {
      job_title: 'Software Developer',
      job_category_id: techCat,
      employer_id: null,
      country_id: UG,
      experience_level: 'entry',
      employment_type: 'full_time',
      currency: 'UGX',
      gross_monthly_salary: rand(1_500_000, 2_500_000),
      net_monthly_salary: 0,
      years_of_experience: rand(0, 2),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Software Developer',
      job_category_id: techCat,
      employer_id: null,
      country_id: UG,
      experience_level: 'mid',
      employment_type: 'full_time',
      currency: 'UGX',
      gross_monthly_salary: rand(3_000_000, 6_000_000),
      net_monthly_salary: 0,
      years_of_experience: rand(3, 7),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Accountant',
      job_category_id: financeCat,
      employer_id: null,
      country_id: UG,
      experience_level: 'entry',
      employment_type: 'full_time',
      currency: 'UGX',
      gross_monthly_salary: rand(800_000, 1_500_000),
      net_monthly_salary: 0,
      years_of_experience: rand(0, 2),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Accountant',
      job_category_id: financeCat,
      employer_id: null,
      country_id: UG,
      experience_level: 'mid',
      employment_type: 'full_time',
      currency: 'UGX',
      gross_monthly_salary: rand(2_000_000, 3_500_000),
      net_monthly_salary: 0,
      years_of_experience: rand(3, 7),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Project Coordinator',
      job_category_id: managementCat,
      employer_id: null,
      country_id: UG,
      experience_level: 'entry',
      employment_type: 'contract',
      currency: 'UGX',
      gross_monthly_salary: rand(1_200_000, 2_000_000),
      net_monthly_salary: 0,
      years_of_experience: rand(1, 3),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Project Manager',
      job_category_id: managementCat,
      employer_id: null,
      country_id: UG,
      experience_level: 'mid',
      employment_type: 'full_time',
      currency: 'UGX',
      gross_monthly_salary: rand(3_500_000, 6_000_000),
      net_monthly_salary: 0,
      years_of_experience: rand(4, 9),
      is_anonymous: true,
      is_verified: false,
    },

    // ── RWANDA ─────────────────────────────────────────────────────────────────
    {
      job_title: 'Software Developer',
      job_category_id: techCat,
      employer_id: null,
      country_id: RW,
      experience_level: 'entry',
      employment_type: 'full_time',
      currency: 'RWF',
      gross_monthly_salary: rand(300_000, 600_000),
      net_monthly_salary: 0,
      years_of_experience: rand(0, 2),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Software Developer',
      job_category_id: techCat,
      employer_id: null,
      country_id: RW,
      experience_level: 'mid',
      employment_type: 'full_time',
      currency: 'RWF',
      gross_monthly_salary: rand(700_000, 1_200_000),
      net_monthly_salary: 0,
      years_of_experience: rand(3, 7),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Senior Software Engineer',
      job_category_id: techCat,
      employer_id: null,
      country_id: RW,
      experience_level: 'senior',
      employment_type: 'full_time',
      currency: 'RWF',
      gross_monthly_salary: rand(1_500_000, 2_500_000),
      net_monthly_salary: 0,
      years_of_experience: rand(7, 13),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Accountant',
      job_category_id: financeCat,
      employer_id: null,
      country_id: RW,
      experience_level: 'entry',
      employment_type: 'full_time',
      currency: 'RWF',
      gross_monthly_salary: rand(200_000, 400_000),
      net_monthly_salary: 0,
      years_of_experience: rand(0, 2),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'Finance Manager',
      job_category_id: financeCat,
      employer_id: null,
      country_id: RW,
      experience_level: 'mid',
      employment_type: 'full_time',
      currency: 'RWF',
      gross_monthly_salary: rand(800_000, 1_500_000),
      net_monthly_salary: 0,
      years_of_experience: rand(4, 9),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'NGO Program Officer',
      job_category_id: ngoCat,
      employer_id: null,
      country_id: RW,
      experience_level: 'entry',
      employment_type: 'full_time',
      currency: 'RWF',
      gross_monthly_salary: rand(350_000, 600_000),
      net_monthly_salary: 0,
      years_of_experience: rand(0, 3),
      is_anonymous: true,
      is_verified: false,
    },
    {
      job_title: 'NGO Program Manager',
      job_category_id: ngoCat,
      employer_id: null,
      country_id: RW,
      experience_level: 'mid',
      employment_type: 'full_time',
      currency: 'RWF',
      gross_monthly_salary: rand(900_000, 1_600_000),
      net_monthly_salary: 0,
      years_of_experience: rand(4, 9),
      is_anonymous: true,
      is_verified: false,
    },
  ];

  // Compute net monthly salary based on country (TZ/KE: 80%, UG/RW: 85%)
  const ke_tz = new Set([KE, TZ]);
  for (const s of submissions) {
    const factor = ke_tz.has(s.country_id) ? 0.8 : 0.85;
    s.net_monthly_salary = Math.round(s.gross_monthly_salary * factor);
  }

  // Insert all rows
  const result = await sql`
    INSERT INTO salary_submissions (
      job_title, job_category_id, employer_id, country_id,
      experience_level, employment_type, currency,
      gross_monthly_salary, net_monthly_salary, years_of_experience,
      is_anonymous, is_verified
    )
    SELECT * FROM UNNEST(
      ${sql.array(submissions.map(s => s.job_title))}::text[],
      ${sql.array(submissions.map(s => s.job_category_id))}::uuid[],
      ${sql.array(submissions.map(s => s.employer_id))}::uuid[],
      ${sql.array(submissions.map(s => s.country_id))}::uuid[],
      ${sql.array(submissions.map(s => s.experience_level))}::experience_level[],
      ${sql.array(submissions.map(s => s.employment_type))}::employment_type[],
      ${sql.array(submissions.map(s => s.currency))}::text[],
      ${sql.array(submissions.map(s => s.gross_monthly_salary))}::numeric[],
      ${sql.array(submissions.map(s => s.net_monthly_salary))}::numeric[],
      ${sql.array(submissions.map(s => s.years_of_experience))}::integer[],
      ${sql.array(submissions.map(s => s.is_anonymous))}::boolean[],
      ${sql.array(submissions.map(s => s.is_verified))}::boolean[]
    ) AS t(
      job_title, job_category_id, employer_id, country_id,
      experience_level, employment_type, currency,
      gross_monthly_salary, net_monthly_salary, years_of_experience,
      is_anonymous, is_verified
    )
    RETURNING id
  `;

  console.log(`✅ Inserted ${result.length} salary submissions`);
  console.log(`   KE: ${submissions.filter(s => s.country_id === KE).length}`);
  console.log(`   TZ: ${submissions.filter(s => s.country_id === TZ).length}`);
  console.log(`   UG: ${submissions.filter(s => s.country_id === UG).length}`);
  console.log(`   RW: ${submissions.filter(s => s.country_id === RW).length}`);

  await sql.end();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
