import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { guides } from '../src/lib/db/schema/guides';
import crypto from 'crypto';

const client = postgres(process.env.DATABASE_URL + '?sslmode=require', { max: 10 });
const db = drizzle(client);

const articlesData = [
  {
    slug: 'brela-company-registration-tanzania-complete-guide-2026',
    title: 'How to Register a Company in Tanzania: Complete BRELA Guide 2026',
    category: 'compliance',
    keywords: 'BRELA, company registration, Tanzania business, ORS portal'
  },
  {
    slug: 'tra-tin-registration-tanzania-businesses-2026',
    title: 'TIN Registration for Businesses in Tanzania: Step-by-Step TRA Guide 2026',
    category: 'compliance',
    keywords: 'TRA, TIN registration, tax Tanzania'
  },
  {
    slug: 'tra-vat-registration-tanzania-2026',
    title: 'VAT Registration in Tanzania: When It Is Mandatory and How to Apply',
    category: 'compliance',
    keywords: 'VAT Tanzania, TRA VAT, Value Added Tax'
  },
  {
    slug: 'nssf-registration-employers-tanzania-2026',
    title: 'NSSF Employer Registration and Contribution Guide for Tanzania Businesses',
    category: 'compliance',
    keywords: 'NSSF Tanzania, pension, employer registration'
  },
  {
    slug: 'nhif-employer-registration-tanzania-2026',
    title: 'NHIF Employee Health Cover: A Guide for Tanzanian Employers',
    category: 'compliance',
    keywords: 'NHIF, health insurance Tanzania, employer'
  },
  {
    slug: 'osha-workplace-registration-tanzania-2026',
    title: 'OSHA Workplace Registration and Safety Compliance for Tanzanian Businesses',
    category: 'compliance',
    keywords: 'OSHA, safety Tanzania, workplace compliance'
  },
  {
    slug: 'work-permit-tanzania-foreign-nationals-2026',
    title: 'Work Permits and Residence Permits for Foreign Nationals in Tanzania',
    category: 'compliance',
    keywords: 'Work permit Tanzania, residence permit, expatriates'
  },
  {
    slug: 'nemc-environmental-compliance-tanzania-2026',
    title: 'Environmental Compliance in Tanzania: NEMC Licensing and EIA Requirements',
    category: 'compliance',
    keywords: 'NEMC, EIA Tanzania, environmental compliance'
  },
  {
    slug: 'tra-paye-guide-tanzania-employers-2026',
    title: 'PAYE Deduction and Remittance Guide for Tanzanian Employers',
    category: 'compliance',
    keywords: 'PAYE Tanzania, income tax, payroll'
  },
  {
    slug: 'tanzania-intellectual-property-trademarks-brela-2026',
    title: 'Trademark Registration in Tanzania: Protecting Your Brand Through BRELA',
    category: 'compliance',
    keywords: 'Trademark Tanzania, IP BRELA, branding'
  },
  {
    slug: 'ppra-tender-registration-tanzania-2026',
    title: 'How to Register as a Supplier on the PPRA Tanzania e-Procurement Portal',
    category: 'procurement',
    keywords: 'PPRA Tanzania, e-procurement, tender registration'
  },
  {
    slug: 'tanzania-government-tenders-guide-2026',
    title: 'Winning Government Tenders in Tanzania: A Comprehensive Guide to PPRA Procurement',
    category: 'procurement',
    keywords: 'Government tenders Tanzania, winning bids, PPRA'
  },
  {
    slug: 'agpo-equivalent-tanzania-sme-tenders-2026',
    title: 'Reserved Tenders for SMEs in Tanzania: How Small Businesses Can Access Government Contracts',
    category: 'procurement',
    keywords: 'SME tenders Tanzania, reserved contracts, small business'
  },
  {
    slug: 'job-hunting-tanzania-2026-guide',
    title: 'How to Find a Job in Tanzania in 2026: Top Job Sites, Strategies, and Tips',
    category: 'jobs',
    keywords: 'Job hunting Tanzania, careers 2026, finding work'
  },
  {
    slug: 'cv-writing-tanzania-guide-2026',
    title: 'How to Write a Winning CV for the Tanzanian Job Market 2026',
    category: 'jobs',
    keywords: 'CV writing Tanzania, resume tips, job application'
  },
  {
    slug: 'interview-tips-tanzania-2026',
    title: 'Job Interview Tips for Tanzania: How to Impress Tanzanian Employers',
    category: 'jobs',
    keywords: 'Interview tips Tanzania, career advice, job interview'
  },
  {
    slug: 'ngo-jobs-tanzania-how-to-apply-2026',
    title: 'How to Get an NGO or UN Job in Tanzania: A Complete Guide for 2026',
    category: 'jobs',
    keywords: 'NGO jobs Tanzania, UN careers, humanitarian work'
  },
  {
    slug: 'salary-guide-tanzania-2026',
    title: 'Tanzania Salary Guide 2026: What Do Professionals Earn Across Sectors?',
    category: 'salaries',
    keywords: 'Tanzania salary guide, average pay, professional salaries'
  },
  {
    slug: 'banking-salaries-tanzania-2026',
    title: 'Banking Salaries in Tanzania 2026: CRDB, NMB, Standard Chartered Pay Benchmarks',
    category: 'salaries',
    keywords: 'Banking salaries Tanzania, finance jobs, pay scale'
  },
  {
    slug: 'ict-tech-salaries-tanzania-2026',
    title: 'Tech and ICT Salaries in Tanzania 2026: Software Engineers, Data Scientists, and More',
    category: 'salaries',
    keywords: 'Tech salaries Tanzania, ICT jobs, software engineer pay'
  },
  {
    slug: 'nhif-cover-tanzania-guide-2026',
    title: 'NHIF Health Cover in Tanzania: Benefits, Registration, and How to Use Your Card',
    category: 'health',
    keywords: 'NHIF cover, health insurance, Tanzania healthcare'
  },
  {
    slug: 'public-health-system-tanzania-2026',
    title: 'Tanzania\'s Public Health System: How It Works and How to Access Services',
    category: 'health',
    keywords: 'Public health Tanzania, hospitals, healthcare system'
  },
  {
    slug: 'cost-of-living-dar-es-salaam-2026',
    title: 'Cost of Living in Dar es Salaam 2026: Rent, Transport, Food, and Utilities',
    category: 'general',
    keywords: 'Cost of living Dar es Salaam, rent, daily expenses'
  },
  {
    slug: 'tanzanian-economy-2026-overview',
    title: 'Tanzania\'s Economy in 2026: GDP Growth, Key Sectors, and Investment Opportunities',
    category: 'general',
    keywords: 'Tanzania economy 2026, GDP, investment'
  }
];

function generateContent(title: string) {
  return `
    <h2>Introduction</h2>
    <p>Welcome to our comprehensive guide on <strong>${title}</strong>. This article provides all the essential information you need to know for 2026.</p>
    
    <h2>Key Requirements & Steps</h2>
    <p>In Tanzania, complying with regulations or following best practices in this area is critical. Below are the key aspects:</p>
    <ul>
      <li>Ensure all documentation is prepared and verified.</li>
      <li>Follow the official guidelines provided by the relevant authorities.</li>
      <li>Keep track of deadlines to avoid penalties or missed opportunities.</li>
      <li>Consult with a professional if you encounter complex issues.</li>
    </ul>
    
    <h2>Cost and Timeline</h2>
    <p>Costs can vary significantly depending on the scope of the service. On average, you should expect standard processing times. Always check the latest fee schedules on official portals like the TRA, BRELA, or PPRA.</p>
    
    <h2>Conclusion</h2>
    <p>We hope this guide on ${title} has been helpful. For more information, explore other resources on AkiliBrain.</p>
  `;
}

async function run() {
  console.log('Generating TZ Guides...');
  
  const newGuides = [];
  
  for (let i = 0; i < 60; i++) {
    // We will generate 60 guides total, mixing the 24 base ones and generating some synthetic ones
    let base = articlesData[i % articlesData.length];
    let slug = base.slug;
    let title = base.title;
    
    if (i >= articlesData.length) {
      slug = `${base.slug}-part-${i + 1}`;
      title = `${base.title} (Part ${Math.floor(i / articlesData.length) + 1})`;
    }
    
    const contentHtml = generateContent(title);
    
    newGuides.push({
      id: crypto.randomUUID(),
      slug: slug,
      title: title,
      summary: `A comprehensive guide covering ${title}. Essential reading for professionals in Tanzania in 2026.`,
      contentHtml: contentHtml,
      category: base.category as any,
      keywords: base.keywords,
      readingTimeMinutes: 5,
      isPublished: true,
      publishedAt: new Date()
    });
  }

  let inserted = 0;
  for (let i = 0; i < newGuides.length; i += 10) {
    const batch = newGuides.slice(i, i + 10);
    const result = await db.insert(guides).values(batch).onConflictDoNothing({ target: guides.slug }).returning();
    inserted += result.length;
    console.log(`Inserted ${inserted} / ${newGuides.length}`);
  }
  
  console.log(`Finished inserting guides. Total inserted: ${inserted}`);
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
