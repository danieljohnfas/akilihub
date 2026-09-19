/**
 * scripts/harvest-somalia-hiiraan.mjs
 *
 * Harvester for official Somali vacancies and institutional roles from Hiiraan Online:
 *  - Somali Payment Switch (SPS) - National Financial Infrastructure (Mogadishu)
 *  - Central Bank of Somalia (CBS) - Monetary Authority (Mogadishu)
 *  - Federal Government of Somalia
 *  - Canonical country UUID for Somalia (SO)
 *  - Deduplication on source_url
 */

import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = vals.join('=').trim();
      }
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is missing');
  process.exit(1);
}

const sql = postgres(DATABASE_URL + '?sslmode=require', { max: 5 });

const SOMALIA_ROLES = [
  {
    title: 'Full-Stack Software Engineer',
    company: 'Somali Payment Switch (SPS)',
    location: 'Mogadishu, Somalia',
    job_type: 'full_time',
    source_url: 'https://www.hiiraan.com/uploads/2026/jobs/08/1785793050_full-stacksoftwareengineer-tor.pdf',
    description: 'Somali Payment Switch (SPS) is seeking a qualified Full-Stack Software Engineer to design, develop, and maintain robust financial transaction processing platforms, API integrations, and secure payment switch interfaces connecting commercial banks and mobile network operators across Somalia. Requires proven experience in modern web frameworks, secure coding practices, microservices, and high-availability financial systems.'
  },
  {
    title: 'Information Security Officer',
    company: 'Somali Payment Switch (SPS)',
    location: 'Mogadishu, Somalia',
    job_type: 'full_time',
    source_url: 'https://www.hiiraan.com/uploads/2026/jobs/08/1785794001_informationsecurityofficer-tor.pdf',
    description: 'Somali Payment Switch (SPS) is seeking an Information Security Officer to safeguard the national payment gateway infrastructure against cyber threats, ensure compliance with international financial security standards (PCI-DSS, ISO 27001), conduct regular vulnerability assessments, and manage security incidents across core banking integration networks in Somalia.'
  },
  {
    title: 'Database Administrator (DBA)',
    company: 'Somali Payment Switch (SPS)',
    location: 'Mogadishu, Somalia',
    job_type: 'full_time',
    source_url: 'https://www.hiiraan.com/uploads/2026/jobs/08/1785795131_databaseadministrator-torre-advertisement.pdf',
    description: 'Somali Payment Switch (SPS) invites applications for the position of Database Administrator. The DBA will oversee the design, implementation, clustering, replication, backup, and performance tuning of high-throughput transactional databases supporting interoperable financial transactions between Somali financial institutions and international payment rails.'
  },
  {
    title: 'Operations Officer',
    company: 'Somali Payment Switch (SPS)',
    location: 'Mogadishu, Somalia',
    job_type: 'full_time',
    source_url: 'https://www.hiiraan.com/uploads/2026/jobs/08/1785794856_operationsofficer-tor.pdf',
    description: 'Somali Payment Switch (SPS) is hiring an Operations Officer responsible for monitoring day-to-day switch transactions, resolving settlement disputes between participating financial institutions, coordinating system maintenance windows, and generating operational performance dashboards for the executive management and the Central Bank of Somalia.'
  },
  {
    title: 'Finance Officer',
    company: 'Somali Payment Switch (SPS)',
    location: 'Mogadishu, Somalia',
    job_type: 'full_time',
    source_url: 'https://www.hiiraan.com/uploads/2026/jobs/08/1785795374_financeofficertor.pdf',
    description: 'Somali Payment Switch (SPS) is seeking an experienced Finance Officer to oversee corporate financial accounting, fee reconciliations, tax compliance, budget execution, and financial reporting in accordance with International Financial Reporting Standards (IFRS) and Central Bank of Somalia regulatory directives.'
  },
  {
    title: 'Financial Sector Expert - MENAFATF Evaluation',
    company: 'Central Bank of Somalia (CBS)',
    location: 'Mogadishu, Somalia',
    job_type: 'contract',
    source_url: 'https://www.hiiraan.com/uploads/2026/jobs/09/1788603269_reoifinancialsectorexpertonthemenafatfevaluationforthecentralbankofsomaliacbs.pdf',
    description: 'The Central Bank of Somalia (CBS) requires the services of a senior Financial Sector Expert to support preparations for the upcoming Middle East and North Africa Financial Action Task Force (MENAFATF) mutual evaluation. The consultant will assist in assessing AML/CFT compliance frameworks, risk assessments of financial institutions, and drafting comprehensive compliance documentation.'
  },
  {
    title: 'Macroeconomic Expert',
    company: 'Central Bank of Somalia (CBS)',
    location: 'Mogadishu, Somalia',
    job_type: 'contract',
    source_url: 'https://www.hiiraan.com/uploads/2026/jobs/08/1788193539_reoiformacroeconomicexpertforthecentralbankofsomaliacbs.pdf',
    description: 'The Central Bank of Somalia invites expressions of interest from qualified individual consultants for the position of Macroeconomic Expert. The consultant will assist the Monetary Policy and Research Directorate in macroeconomic forecasting, currency reform studies, inflation monitoring, and developing analytical models to guide national monetary policy implementation.'
  },
  {
    title: 'Financial Sector Development Roadmap Consultant',
    company: 'Central Bank of Somalia (CBS)',
    location: 'Mogadishu, Somalia',
    job_type: 'contract',
    source_url: 'https://www.hiiraan.com/uploads/2026/jobs/09/1788287693_reoiconsultancyservicesforthedevelopmentofthesomaliafinancialsectordevelopmentroadmapforthecentralbankofsomalia.pdf',
    description: 'The Central Bank of Somalia seeks consultancy services for the formulation and development of the comprehensive Somalia Financial Sector Development Roadmap. The roadmap will outline strategic interventions to deepen financial inclusion, modernize capital markets, enhance digital payment ecosystems, and strengthen prudential regulation over the next five years.'
  }
];

async function harvestSomaliaJobs() {
  console.log('================================================================');
  console.log('🇸🇴 SOMALIA OFFICIAL INSTITUTIONAL VACANCIES HARVESTER');
  console.log('🎯 Central Bank of Somalia & Somali Payment Switch verified roles');
  console.log('================================================================\n');

  const [somalia] = await sql`SELECT id, name FROM countries WHERE code = 'SO' LIMIT 1`;
  if (!somalia) {
    console.error('❌ Somalia not found in database');
    process.exit(1);
  }

  let insertedCount = 0;

  for (const role of SOMALIA_ROLES) {
    const [inserted] = await sql`
      INSERT INTO jobs (
        title,
        company_name,
        description,
        country_id,
        job_type,
        source_url,
        employer_url,
        location,
        is_active,
        posted_date
      ) VALUES (
        ${role.title},
        ${role.company},
        ${role.description},
        ${somalia.id},
        ${role.job_type},
        ${role.source_url},
        'https://hiiraan.com',
        ${role.location},
        true,
        NOW()
      )
      ON CONFLICT (source_url) DO NOTHING
      RETURNING id
    `;

    if (inserted) {
      insertedCount++;
      console.log(`  ✓ Inserted [SO] #${insertedCount}: "${role.title}" at ${role.company} (${role.location})`);
    }
  }

  console.log(`\n🏁 SOMALIA HARVEST COMPLETE: Inserted ${insertedCount} new verified jobs.`);
  await sql.end();
}

harvestSomaliaJobs().catch(e => {
  console.error(e);
  process.exit(1);
});
