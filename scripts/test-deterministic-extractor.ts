import {
  extractDeadlineFromText,
  extractSalaryFromText,
  extractStructuredRequirements,
  extractTenderReference,
  detectTenderCategory,
  extractDeterministicJobFields,
  extractDeterministicTenderFields,
} from '../src/lib/scrapers/deterministic-extractor';
import { extractJobsWithAI } from '../src/lib/scrapers/broad-search-engine';
import { extractTendersWithAI } from '../src/lib/scrapers/broad-search-engine-tenders';
import { extractComplianceWithAI } from '../src/lib/scrapers/broad-search-engine-compliance';
import { extractHealthWithAI } from '../src/lib/scrapers/broad-search-engine-health';

async function runTests() {
  console.log('--- STARTING DETERMINISTIC EXTRACTOR UNIT TESTS ---');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Deadlines (EN, FR, SW)
  const dEn = extractDeadlineFromText("Application closes on: 25th September 2026 at 5pm EAT");
  assert(dEn !== null && dEn.getUTCFullYear() === 2026 && dEn.getUTCMonth() === 8 && dEn.getUTCDate() === 25, "English Deadline Date Parsing");

  const dFr = extractDeadlineFromText("Date limite de soumission: 15 Novembre 2026");
  assert(dFr !== null && dFr.getUTCFullYear() === 2026 && dFr.getUTCMonth() === 10 && dFr.getUTCDate() === 15, "French Deadline Date Parsing");

  const dSw = extractDeadlineFromText("Tarehe ya mwisho ya kutuma maombi: 10 Desemba 2026");
  assert(dSw !== null && dSw.getUTCFullYear() === 2026 && dSw.getUTCMonth() === 11 && dSw.getUTCDate() === 10, "Swahili Deadline Date Parsing");

  const dIso = extractDeadlineFromText("Closing Date: 2026-10-31");
  assert(dIso !== null && dIso.getUTCFullYear() === 2026 && dIso.getUTCMonth() === 9 && dIso.getUTCDate() === 31, "ISO Deadline Date Parsing");

  // 2. Salaries & Currencies
  const sKes = extractSalaryFromText("Gross Remuneration: KES 150,000 - 250,000 per month");
  assert(sKes.salaryCurrency === 'KES' && sKes.salaryMin === 150000 && sKes.salaryMax === 250000, "KES Salary Range Parsing");

  const sUsd = extractSalaryFromText("Compensation: $3,500 to $5,000 USD / mo");
  assert(sUsd.salaryCurrency === 'USD' && sUsd.salaryMin === 3500 && sUsd.salaryMax === 5000, "USD Salary Range Parsing");

  const sUgx = extractSalaryFromText("Salary: 3.5M UGX");
  assert(sUgx.salaryCurrency === 'UGX' && sUgx.salaryMin === 3500000 && sUgx.salaryMax === 3500000, "UGX Single Figure Parsing with M multiplier");

  const sRwf = extractSalaryFromText("Gross Salary: 800k RWF");
  assert(sRwf.salaryCurrency === 'RWF' && sRwf.salaryMin === 800000 && sRwf.salaryMax === 800000, "RWF Single Figure Parsing with k multiplier");

  // 3. Structured Requirements
  const sampleReqText = `
    About Company:
    We are a leading telecommunications provider in Nairobi.

    Requirements & Qualifications:
    - Bachelor's degree in Computer Science or Software Engineering
    - 4+ years of professional full-stack TypeScript and React experience
    - Proven track record with PostgreSQL and cloud deployment (AWS/GCP)
    - Strong communication and leadership skills

    How to Apply:
    Send CV to jobs@safari.co.ke before deadline.
  `;
  const reqs = extractStructuredRequirements(sampleReqText);
  assert(reqs !== null && reqs.includes("Bachelor's degree") && reqs.includes("4+ years") && reqs.includes('; '), "Structured Bulleted Requirements Parsing");

  // 4. Tender References & Categories
  const tRef = extractTenderReference("TENDER NOTICE: Tender No: KRA/HQS/NCB-042/2026-2027 for Provision of Security Services");
  assert(tRef === 'KRA/HQS/NCB-042/2026-2027', "Tender Reference Number Extraction");

  const tCat1 = detectTenderCategory("Expression of Interest for Technical Assistance and Consultancy Advisory Services");
  assert(tCat1 === 'consultancy', "Tender Category Consultancy Detection");

  const tCat2 = detectTenderCategory("Invitation for Bids for Construction and Rehabilitation of Water Boreholes");
  assert(tCat2 === 'works', "Tender Category Works Detection");

  // 5. End-to-End Deterministic Job Extraction
  const jobResult = extractDeterministicJobFields(sampleReqText, "https://safari.co.ke/careers/dev-1");
  assert(jobResult.requirements !== null && jobResult.applicationEmails.includes('jobs@safari.co.ke'), "Deterministic Job Extraction Complete");

  // 6. Graceful Fallback on Extraction Functions when AI is offline
  console.log('\n--- TESTING GRACEFUL AI-FALLBACK CAPABILITIES ---');
  const dummyJobSnippet = `
    Job Title: Senior Cloud Infrastructure Engineer
    Organization: Africa Data Centres
    We are seeking an experienced engineer to oversee regional cloud data infrastructure.
    Requirements:
    - 5+ years DevOps experience with Kubernetes and Terraform
    - Degree in Telecommunications or Computer Science
    - Certification in AWS or Azure Solutions Architecture
    Remuneration: KES 300,000 - 450,000 / month
    Deadline: 15 November 2026
    Apply online at: https://careers.africadatacentres.com/apply/cloud-eng-01
  `;
  const fallbackJobs = await extractJobsWithAI(dummyJobSnippet, "https://africadatacentres.com/careers");
  assert(fallbackJobs.length > 0 && fallbackJobs[0].title.length > 0, "Jobs Extraction Returns Valid Record (AI or Deterministic Fallback)");
  console.log(`Extracted Job: Title="${fallbackJobs[0].title}", SalaryMin=${fallbackJobs[0].salaryMin}, Deadline=${fallbackJobs[0].deadline}`);

  const dummyTenderSnippet = `
    TENDER NOTICE
    Tender Ref: MOH/UG/2026/GDS/091
    Supply and Delivery of Specialized Diagnostic Laboratory Equipment
    Procuring Entity: Ministry of Health Uganda
    Closing Date: 2026-11-30
    Budget: $850,000 USD
  `;
  const fallbackTenders = await extractTendersWithAI(dummyTenderSnippet, "https://health.go.ug/tenders");
  assert(fallbackTenders.length > 0 && fallbackTenders[0].referenceNo.includes('091'), "Tenders Extraction Returns Valid Record");
  console.log(`Extracted Tender: Ref="${fallbackTenders[0].referenceNo}", Category=${fallbackTenders[0].category}, Budget=${fallbackTenders[0].budget} ${fallbackTenders[0].currency}`);

  const dummyComplianceSnippet = `
    Kenya Revenue Authority - Statutory Notice
    Guideline: Value Added Tax (VAT) Electronic Invoicing Compliance Notice
    All registered VAT taxpayers must onboard to the electronic tax invoice management system (eTIMS).
    Penalties for non-compliance include statutory fines under Section 56 of the Tax Procedures Act.
  `;
  const fallbackCompliance = await extractComplianceWithAI(dummyComplianceSnippet, "https://kra.go.ke/etims");
  assert(fallbackCompliance.length > 0 && fallbackCompliance[0].category === 'tax', "Compliance Extraction Returns Valid Record");

  const dummyHealthSnippet = `
    Kenya National Health Indicator Survey Report 2026:
    Key Maternal & Child Health Metrics:
    - Maternal Mortality Ratio: 342 per 100,000 live births
    - Under-5 Mortality Rate: 39 per 1,000 live births
    - Life Expectancy: 67.5 years
    - HIV Prevalence: 3.7%
  `;
  const fallbackHealth = await extractHealthWithAI(dummyHealthSnippet, "https://health.go.ke/indicators");
  assert(fallbackHealth.length >= 3, "Health Indicator Extraction Returns Valid Metrics");
  console.log(`Extracted Health Indicators count: ${fallbackHealth.length}`);

  console.log(`\n================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(e => {
  console.error("Test execution error:", e);
  process.exit(1);
});
