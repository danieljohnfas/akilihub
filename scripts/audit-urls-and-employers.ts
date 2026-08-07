import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { jobs } from '../src/lib/db/schema/jobs';
import { tenders } from '../src/lib/db/schema/tenders';
import { complianceRequirements } from '../src/lib/db/schema/compliance';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
if (!dbUrl) {
  console.error("DATABASE_URL is missing!");
  process.exit(1);
}

const isCloudDb = dbUrl.includes('supabase.com') || dbUrl.includes('neon.tech') || dbUrl.includes('pooler.supabase.com');
const conn = postgres(dbUrl, {
  ssl: isCloudDb || process.env.NODE_ENV === 'production' ? 'require' : false,
  max: 10,
  idle_timeout: 10,
  connect_timeout: 10,
  prepare: false,
});

const db = drizzle(conn);

interface DomainStats {
  domain: string;
  count: number;
  type: 'direct_employer' | 'ats_platform' | 'government_official' | 'job_aggregator' | 'generic_blog_portal' | 'invalid_or_anchor' | 'suspicious';
  sampleEntities: string[];
  sampleUrls: string[];
}

const ATS_DOMAINS = [
  'lever.co', 'greenhouse.io', 'workable.com', 'bamboohr.com', 'smartrecruiters.com',
  'myworkdayjobs.com', 'recruitee.com', 'taleo.net', 'breezy.hr', 'ashbyhq.com', 'personio.com',
  'icims.com', 'jobvite.com', 'applytojob.com', 'rippling.com'
];

const KNOWN_AGGREGATORS = [
  'brightermonday.co.ke', 'brightermonday.co.ug', 'brightermonday.co.tz',
  'fuzu.com', 'jobwebkenya.com', 'myjobmag.co.ke', 'reliefweb.int', 'unjobs.org',
  'kenyajob.com', 'jobsearchkenya.com', 'glassdoor.com', 'linkedin.com', 'indeed.com',
  'jobinrwanda.com', 'ugandajob.com', 'tanzaniajob.com', 'careers24.com', 'shortlist.net'
];

const GOV_TLDS = ['.go.ke', '.go.ug', '.go.tz', '.gov.rw', '.gov.et', '.gov.so', '.gouv.cd', '.gov.bi', '.gov'];

function classifyDomain(hostname: string): DomainStats['type'] {
  if (!hostname || hostname.includes('example.com') || hostname === 'localhost') return 'invalid_or_anchor';
  const lower = hostname.toLowerCase();
  
  if (ATS_DOMAINS.some(ats => lower.endsWith(ats) || lower.includes(ats))) return 'ats_platform';
  if (GOV_TLDS.some(gov => lower.endsWith(gov) || lower.includes(gov))) return 'government_official';
  if (KNOWN_AGGREGATORS.some(agg => lower.endsWith(agg) || lower.includes(agg))) return 'job_aggregator';
  if (lower.includes('blog') || lower.includes('news') || lower.includes('wordpress')) return 'generic_blog_portal';
  
  return 'direct_employer';
}

function extractDomain(urlStr: string | null): string {
  if (!urlStr) return 'NULL_OR_MISSING';
  if (urlStr.startsWith('#')) return 'HASH_ANCHOR';
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return 'INVALID_URL_FORMAT';
  }
}

async function audit() {
  console.log('====================================================');
  console.log('🔍 AKILIHUB EMPLOYER & SOURCE URL AUDIT');
  console.log('====================================================\n');

  // 1. JOBS AUDIT
  console.log('--- 1. AUDITING JOBS TABLE ---');
  const allJobs = await db.select({
    id: jobs.id,
    title: jobs.title,
    companyName: jobs.companyName,
    sourceUrl: jobs.sourceUrl,
    employerUrl: jobs.employerUrl,
    isActive: jobs.isActive,
  }).from(jobs);

  console.log(`Total Jobs in DB: ${allJobs.length}`);

  const jobSourceDomains = new Map<string, { count: number; companies: Set<string>; samples: string[] }>();
  const jobEmployerDomains = new Map<string, { count: number; companies: Set<string>; samples: string[] }>();

  let jobsMissingSource = 0;
  let jobsMissingEmployer = 0;
  let jobsWithAnchorSource = 0;
  let jobsWithDirectEmployer = 0;
  let jobsWithAggregatorSource = 0;
  let genericCompanyNames = 0;

  for (const j of allJobs) {
    const compName = (j.companyName || 'UNKNOWN').trim();
    if (/^(company|unknown|n\/a|various|confidential|advertiser)$/i.test(compName) || compName.length <= 2) {
      genericCompanyNames++;
    }

    // Source URL
    const sDomain = extractDomain(j.sourceUrl);
    if (sDomain === 'NULL_OR_MISSING' || sDomain === 'INVALID_URL_FORMAT') jobsMissingSource++;
    if (sDomain === 'HASH_ANCHOR' || (j.sourceUrl && j.sourceUrl.includes('#'))) jobsWithAnchorSource++;

    const sEntry = jobSourceDomains.get(sDomain) || { count: 0, companies: new Set<string>(), samples: [] };
    sEntry.count++;
    sEntry.companies.add(compName);
    if (sEntry.samples.length < 3 && j.sourceUrl) sEntry.samples.push(j.sourceUrl);
    jobSourceDomains.set(sDomain, sEntry);

    // Employer URL
    if (!j.employerUrl) {
      jobsMissingEmployer++;
    } else {
      const eDomain = extractDomain(j.employerUrl);
      const eType = classifyDomain(eDomain);
      if (eType === 'direct_employer' || eType === 'ats_platform' || eType === 'government_official') {
        jobsWithDirectEmployer++;
      }
      const eEntry = jobEmployerDomains.get(eDomain) || { count: 0, companies: new Set<string>(), samples: [] };
      eEntry.count++;
      eEntry.companies.add(compName);
      if (eEntry.samples.length < 3) eEntry.samples.push(j.employerUrl);
      jobEmployerDomains.set(eDomain, eEntry);
    }
  }

  console.log(`\nJobs Breakdown:`);
  console.log(`  - Total active: ${allJobs.filter(j => j.isActive).length}`);
  console.log(`  - With resolved Employer URL: ${allJobs.length - jobsMissingEmployer} (${((allJobs.length - jobsMissingEmployer) / (allJobs.length || 1) * 100).toFixed(1)}%)`);
  console.log(`  - Missing Employer URL (only sourceUrl): ${jobsMissingEmployer}`);
  console.log(`  - Containing anchor fragments in sourceUrl: ${jobsWithAnchorSource}`);
  console.log(`  - Generic / Placeholder Company Names: ${genericCompanyNames}`);

  console.log(`\nTop Job Source URL Domains (by count):`);
  const sortedJobSourceDomains = Array.from(jobSourceDomains.entries()).sort((a, b) => b[1].count - a[1].count);
  for (const [dom, data] of sortedJobSourceDomains.slice(0, 15)) {
    const classification = classifyDomain(dom);
    console.log(`  • ${dom.padEnd(35)} | ${data.count.toString().padStart(4)} jobs | Type: ${classification.padEnd(20)} | Companies: ${Array.from(data.companies).slice(0, 3).join(', ')}`);
  }

  console.log(`\nTop Job Employer URL Domains (Direct/Resolved):`);
  const sortedJobEmpDomains = Array.from(jobEmployerDomains.entries()).sort((a, b) => b[1].count - a[1].count);
  for (const [dom, data] of sortedJobEmpDomains.slice(0, 15)) {
    const classification = classifyDomain(dom);
    console.log(`  • ${dom.padEnd(35)} | ${data.count.toString().padStart(4)} jobs | Type: ${classification.padEnd(20)} | Sample: ${data.samples[0]}`);
  }

  // 2. TENDERS AUDIT
  console.log('\n\n--- 2. AUDITING TENDERS TABLE ---');
  const allTenders = await db.select({
    id: tenders.id,
    title: tenders.title,
    contractingAuthority: tenders.contractingAuthority,
    sourceUrl: tenders.sourceUrl,
    employerUrl: tenders.employerUrl,
    status: tenders.status,
  }).from(tenders);

  console.log(`Total Tenders in DB: ${allTenders.length}`);

  const tenderSourceDomains = new Map<string, { count: number; authorities: Set<string>; samples: string[] }>();
  let tenderMissingEmployer = 0;
  let tenderAnchorSource = 0;

  for (const t of allTenders) {
    const auth = (t.contractingAuthority || 'UNKNOWN').trim();
    const sDomain = extractDomain(t.sourceUrl);
    if (sDomain === 'HASH_ANCHOR' || (t.sourceUrl && t.sourceUrl.includes('#'))) tenderAnchorSource++;
    if (!t.employerUrl) tenderMissingEmployer++;

    const sEntry = tenderSourceDomains.get(sDomain) || { count: 0, authorities: new Set<string>(), samples: [] };
    sEntry.count++;
    sEntry.authorities.add(auth);
    if (sEntry.samples.length < 3 && t.sourceUrl) sEntry.samples.push(t.sourceUrl);
    tenderSourceDomains.set(sDomain, sEntry);
  }

  console.log(`\nTenders Breakdown:`);
  console.log(`  - With resolved Employer/Authority URL: ${allTenders.length - tenderMissingEmployer}`);
  console.log(`  - Missing Employer/Authority URL: ${tenderMissingEmployer}`);
  console.log(`  - Anchor source URLs: ${tenderAnchorSource}`);

  console.log(`\nTop Tender Source URL Domains:`);
  const sortedTenderDomains = Array.from(tenderSourceDomains.entries()).sort((a, b) => b[1].count - a[1].count);
  for (const [dom, data] of sortedTenderDomains.slice(0, 15)) {
    const classification = classifyDomain(dom);
    console.log(`  • ${dom.padEnd(35)} | ${data.count.toString().padStart(4)} tenders | Type: ${classification.padEnd(20)} | Authorities: ${Array.from(data.authorities).slice(0, 3).join(', ')}`);
  }

  // 3. COMPLIANCE AUDIT
  console.log('\n\n--- 3. AUDITING COMPLIANCE REQUIREMENTS TABLE ---');
  const allCompliance = await db.select({
    id: complianceRequirements.id,
    title: complianceRequirements.title,
    issuingAuthority: complianceRequirements.issuingAuthority,
    sourceUrl: complianceRequirements.sourceUrl,
    employerUrl: complianceRequirements.employerUrl,
  }).from(complianceRequirements);

  console.log(`Total Compliance Requirements: ${allCompliance.length}`);
  const compSourceDomains = new Map<string, { count: number; authorities: Set<string>; samples: string[] }>();
  for (const c of allCompliance) {
    const auth = (c.issuingAuthority || 'UNKNOWN').trim();
    const sDomain = extractDomain(c.sourceUrl);
    const sEntry = compSourceDomains.get(sDomain) || { count: 0, authorities: new Set<string>(), samples: [] };
    sEntry.count++;
    sEntry.authorities.add(auth);
    if (sEntry.samples.length < 3 && c.sourceUrl) sEntry.samples.push(c.sourceUrl);
    compSourceDomains.set(sDomain, sEntry);
  }

  console.log(`\nTop Compliance Source URL Domains:`);
  const sortedCompDomains = Array.from(compSourceDomains.entries()).sort((a, b) => b[1].count - a[1].count);
  for (const [dom, data] of sortedCompDomains.slice(0, 15)) {
    const classification = classifyDomain(dom);
    console.log(`  • ${dom.padEnd(35)} | ${data.count.toString().padStart(4)} records | Type: ${classification.padEnd(20)} | Sample: ${data.samples[0]}`);
  }

  console.log('\n====================================================');
  console.log('AUDIT COMPLETE');
  console.log('====================================================');
}

audit()
  .catch(e => {
    console.error("Audit error:", e);
  })
  .finally(async () => {
    await conn.end();
  });
