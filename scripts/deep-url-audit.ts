import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { jobs } from '../src/lib/db/schema/jobs';
import { tenders } from '../src/lib/db/schema/tenders';
import { complianceRequirements } from '../src/lib/db/schema/compliance';
import { sql } from 'drizzle-orm';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const isCloudDb = dbUrl.includes('supabase.com') || dbUrl.includes('neon.tech') || dbUrl.includes('pooler.supabase.com');
const conn = postgres(dbUrl, {
  ssl: isCloudDb || process.env.NODE_ENV === 'production' ? 'require' : false,
  max: 10,
  idle_timeout: 10,
  connect_timeout: 10,
  prepare: false,
});
const db = drizzle(conn);

const SOCIAL_SHARE_DOMAINS = ['wa.me', 'api.whatsapp.com', 'facebook.com', 'twitter.com', 'x.com', 'linkedin.com/sharing', 't.me', 'pinterest.com'];
const KNOWN_AGGREGATORS = [
  'brightermonday.co.ke', 'brightermonday.co.ug', 'brightermonday.co.tz',
  'fuzu.com', 'jobwebkenya.com', 'myjobmag.co.ke', 'myjobmagghana.com', 'myjobmag.com',
  'reliefweb.int', 'unjobs.org', 'kenyajob.com', 'jobsearchkenya.com', 'glassdoor.com',
  'indeed.com', 'jobinrwanda.com', 'ugandajob.com', 'tanzaniajob.com', 'careers24.com',
  'alljobspo.com', 'africareers.net', 'geezjobs.com', 'ethiopianreporterjobs.com',
  'jobwebrwanda.com', 'shortlist.net', 'cvmkr.com', 'kazibure.com'
];
const ATS_DOMAINS = [
  'lever.co', 'greenhouse.io', 'workable.com', 'bamboohr.com', 'smartrecruiters.com',
  'myworkdayjobs.com', 'recruitee.com', 'taleo.net', 'breezy.hr', 'ashbyhq.com',
  'personio.com', 'icims.com', 'jobvite.com', 'applytojob.com', 'rippling.com', 'teamtailor.com'
];
const GOV_TLDS = ['.go.ke', '.go.ug', '.go.tz', '.gov.rw', '.gov.et', '.gov.so', '.gouv.cd', '.gov.bi', '.gov', 'kenyalaw.org'];
const TENDER_COMMERCIAL_AGGREGATORS = ['tenderimpulse.com', 'globaltenders.com', 'biddetail.com', 'southsudantenders.com', 'dgmarket.com', 'tendersinfo.com'];

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

async function deepAudit() {
  console.log('===============================================================');
  console.log('📊 DETAILED AUDIT: EMPLOYER & SOURCE URL LEGITIMACY ASSESSMENT');
  console.log('===============================================================\n');

  // --- 1. JOBS ---
  const allJobs = await db.select({
    id: jobs.id,
    title: jobs.title,
    companyName: jobs.companyName,
    sourceUrl: jobs.sourceUrl,
    employerUrl: jobs.employerUrl,
    isActive: jobs.isActive,
  }).from(jobs);

  let jobSocialShareInEmployer = 0;
  let jobAggregatorInEmployer = 0;
  let jobAtsInEmployer = 0;
  let jobGovInEmployer = 0;
  let jobDirectInEmployer = 0;
  let jobNullEmployer = 0;
  let jobInvalidEmployer = 0;

  const aggregatorEmployerMap = new Map<string, number>();
  const directEmployerMap = new Map<string, number>();
  const socialEmployerMap = new Map<string, number>();

  for (const j of allJobs) {
    if (!j.employerUrl) {
      jobNullEmployer++;
      continue;
    }
    const dom = extractDomain(j.employerUrl);
    if (dom === 'INVALID_URL_FORMAT' || dom === 'HASH_ANCHOR') {
      jobInvalidEmployer++;
      continue;
    }

    if (SOCIAL_SHARE_DOMAINS.some(s => dom.includes(s) || j.employerUrl?.includes(s))) {
      jobSocialShareInEmployer++;
      socialEmployerMap.set(dom, (socialEmployerMap.get(dom) || 0) + 1);
    } else if (KNOWN_AGGREGATORS.some(agg => dom.includes(agg) || dom.endsWith(agg))) {
      jobAggregatorInEmployer++;
      aggregatorEmployerMap.set(dom, (aggregatorEmployerMap.get(dom) || 0) + 1);
    } else if (ATS_DOMAINS.some(ats => dom.includes(ats) || dom.endsWith(ats))) {
      jobAtsInEmployer++;
      directEmployerMap.set(dom, (directEmployerMap.get(dom) || 0) + 1);
    } else if (GOV_TLDS.some(gov => dom.includes(gov) || dom.endsWith(gov))) {
      jobGovInEmployer++;
      directEmployerMap.set(dom, (directEmployerMap.get(dom) || 0) + 1);
    } else {
      jobDirectInEmployer++;
      directEmployerMap.set(dom, (directEmployerMap.get(dom) || 0) + 1);
    }
  }

  console.log(`TOTAL JOBS ANALYZED: ${allJobs.length}`);
  console.log(`-----------------------------------------------------------------`);
  console.log(`1. Jobs 'employer_url' Legitimacy Classification:`);
  console.log(`   • Direct Employer / Official Agency / ATS:  ${jobDirectInEmployer + jobAtsInEmployer + jobGovInEmployer} (${((jobDirectInEmployer + jobAtsInEmployer + jobGovInEmployer)/allJobs.length*100).toFixed(1)}%)`);
  console.log(`       - Direct Company Website / Portal:      ${jobDirectInEmployer}`);
  console.log(`       - ATS (Lever, Greenhouse, Workable):    ${jobAtsInEmployer}`);
  console.log(`       - Official Government / Org Portal:     ${jobGovInEmployer}`);
  console.log(`   • Job Aggregator in employer_url (FLAW):    ${jobAggregatorInEmployer} (${(jobAggregatorInEmployer/allJobs.length*100).toFixed(1)}%)`);
  console.log(`   • Social Share Link in employer_url (BUG):  ${jobSocialShareInEmployer} (${(jobSocialShareInEmployer/allJobs.length*100).toFixed(1)}%)`);
  console.log(`   • Unresolved (null employer_url):           ${jobNullEmployer} (${(jobNullEmployer/allJobs.length*100).toFixed(1)}%)`);
  console.log(`   • Malformed / Anchor URL:                   ${jobInvalidEmployer}`);

  console.log(`\nTop Aggregators Incorrectly Saved as employer_url:`);
  Array.from(aggregatorEmployerMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .forEach(([dom, count]) => console.log(`   - ${dom.padEnd(30)} : ${count} jobs`));

  console.log(`\nSocial Share Links Saved as employer_url:`);
  Array.from(socialEmployerMap.entries()).sort((a, b) => b[1] - a[1])
    .forEach(([dom, count]) => console.log(`   - ${dom.padEnd(30)} : ${count} jobs`));

  console.log(`\nTop Direct Employers / Real ATS Domains Saved in employer_url:`);
  Array.from(directEmployerMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15)
    .forEach(([dom, count]) => console.log(`   - ${dom.padEnd(30)} : ${count} jobs`));


  // --- 2. TENDERS ---
  console.log(`\n===============================================================`);
  console.log(`2. Tenders Source & Authority URL Legitimacy:`);
  console.log(`---------------------------------------------------------------`);
  const allTenders = await db.select({
    id: tenders.id,
    title: tenders.title,
    contractingAuthority: tenders.contractingAuthority,
    sourceUrl: tenders.sourceUrl,
    employerUrl: tenders.employerUrl,
  }).from(tenders);

  let tenderGovOfficial = 0;
  let tenderCommercialAggregator = 0;
  let tenderOther = 0;

  const tenderGovDomainMap = new Map<string, number>();
  const tenderAggDomainMap = new Map<string, number>();

  for (const t of allTenders) {
    const sDom = extractDomain(t.sourceUrl);
    if (GOV_TLDS.some(gov => sDom.includes(gov) || sDom.endsWith(gov))) {
      tenderGovOfficial++;
      tenderGovDomainMap.set(sDom, (tenderGovDomainMap.get(sDom) || 0) + 1);
    } else if (TENDER_COMMERCIAL_AGGREGATORS.some(agg => sDom.includes(agg) || sDom.endsWith(agg))) {
      tenderCommercialAggregator++;
      tenderAggDomainMap.set(sDom, (tenderAggDomainMap.get(sDom) || 0) + 1);
    } else {
      tenderOther++;
    }
  }

  console.log(`TOTAL TENDERS ANALYZED: ${allTenders.length}`);
  console.log(`   • Official Government e-GP / Gazette Portals: ${tenderGovOfficial} (${(tenderGovOfficial/allTenders.length*100).toFixed(1)}%) -> HIGH LEGITIMACY`);
  console.log(`   • Commercial Paywalled Tender Aggregators:    ${tenderCommercialAggregator} (${(tenderCommercialAggregator/allTenders.length*100).toFixed(1)}%) -> AGGREGATOR / SECONDARY`);
  console.log(`   • Other / Direct Entities:                    ${tenderOther}`);

  console.log(`\nOfficial Government Tender Portals Breakdown:`);
  Array.from(tenderGovDomainMap.entries()).sort((a, b) => b[1] - a[1])
    .forEach(([dom, count]) => console.log(`   - ${dom.padEnd(30)} : ${count} tenders (Official Public Procurement)`));

  console.log(`\nCommercial Tender Aggregators Breakdown:`);
  Array.from(tenderAggDomainMap.entries()).sort((a, b) => b[1] - a[1])
    .forEach(([dom, count]) => console.log(`   - ${dom.padEnd(30)} : ${count} tenders (Third-party paywalled aggregator)`));


  // --- 3. COMPLIANCE ---
  console.log(`\n===============================================================`);
  console.log(`3. Compliance Requirements Source & Issuing Authority Legitimacy:`);
  console.log(`---------------------------------------------------------------`);
  const allComp = await db.select({
    id: complianceRequirements.id,
    title: complianceRequirements.title,
    issuingAuthority: complianceRequirements.issuingAuthority,
    sourceUrl: complianceRequirements.sourceUrl,
    employerUrl: complianceRequirements.employerUrl,
  }).from(complianceRequirements);

  let compOfficialGov = 0;
  let compConsultancyBlog = 0;
  let compNewsMedia = 0;
  let compOther = 0;

  const compGovMap = new Map<string, number>();
  const compSecondaryMap = new Map<string, number>();

  for (const c of allComp) {
    const sDom = extractDomain(c.sourceUrl);
    if (GOV_TLDS.some(gov => sDom.includes(gov) || sDom.endsWith(gov)) || sDom.includes('nssf.or.ke') || sDom.includes('kenyalaw.org')) {
      compOfficialGov++;
      compGovMap.set(sDom, (compGovMap.get(sDom) || 0) + 1);
    } else if (sDom.includes('tuko.co.ke') || sDom.includes('standardmedia') || sDom.includes('nation.africa')) {
      compNewsMedia++;
      compSecondaryMap.set(sDom, (compSecondaryMap.get(sDom) || 0) + 1);
    } else {
      compConsultancyBlog++;
      compSecondaryMap.set(sDom, (compSecondaryMap.get(sDom) || 0) + 1);
    }
  }

  console.log(`TOTAL COMPLIANCE RECORDS: ${allComp.length}`);
  console.log(`   • Official Government / Statutory Authority URLs: ${compOfficialGov} (${(compOfficialGov/allComp.length*100).toFixed(1)}%) -> PRIMARY SOURCE`);
  console.log(`   • Legal / HR Advisory / EOR Consultancies:       ${compConsultancyBlog} (${(compConsultancyBlog/allComp.length*100).toFixed(1)}%) -> SECONDARY / ADVISORY`);
  console.log(`   • News & Media Articles:                         ${compNewsMedia} (${(compNewsMedia/allComp.length*100).toFixed(1)}%) -> NEWS COMMENTARY`);

  console.log(`\nOfficial Statutory Portals Breakdown:`);
  Array.from(compGovMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12)
    .forEach(([dom, count]) => console.log(`   - ${dom.padEnd(30)} : ${count} requirements (Direct Authority)`));

  console.log(`\nSecondary Advisory / Consultancy / News Sources:`);
  Array.from(compSecondaryMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .forEach(([dom, count]) => console.log(`   - ${dom.padEnd(30)} : ${count} requirements (Advisory/Commentary)`));

  console.log('\n===============================================================');
}

deepAudit()
  .catch(console.error)
  .finally(async () => {
    await conn.end();
  });
