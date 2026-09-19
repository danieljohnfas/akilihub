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
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const sql = postgres(DATABASE_URL + '?sslmode=require', { max: 5 });

function extractHostname(urlStr) {
  if (!urlStr) return 'NULL_OR_EMPTY';
  try {
    const parsed = new URL(urlStr.trim());
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return 'INVALID_URL';
  }
}

const ATS_PATTERNS = [
  'greenhouse.io', 'lever.co', 'workdayjobs.com', 'workdaysite.com', 'bamboohr.com',
  'smartrecruiters.com', 'taleo.net', 'recruitee.com', 'applytojob.com', 'ashbyhq.com',
  'personio.', 'teamtailor.com', 'erecruit.co', 'icims.com', 'jobvite.com', 'oraclecloud.com'
];

const KNOWN_AGGREGATORS = [
  'ajirayako.co.tz', 'mwanampotevu.co.tz', 'jobwebkenya.com', 'jobwebghana.com',
  'jobwebzambia.com', 'jobwebethiopia.com', 'brightermonday.co.ug', 'brightermonday.co.ke',
  'brightermonday.co.tz', 'brightermonday.com', 'hotnigerianjobs.com', 'mediacongo.net',
  'jobinrwanda.com', 'jobinburundi.com', 'hiiraan.com', 'fuzu.com', 'myjobmag.co.ke',
  'myjobmag.com', 'kenyajob.com', 'ugandajob.com', 'tanzaniajobs.co.tz', 'ethiojobs.net',
  'reliefweb.int', 'unjobs.org', 'devex.com', 'impactpool.org', 'comms.southsudanngoforum.org'
];

function classify(host) {
  if (!host || host === 'NULL_OR_EMPTY' || host === 'INVALID_URL') return 'invalid';
  if (ATS_PATTERNS.some(ats => host.includes(ats))) return 'direct_ats';
  if (/\.(go|gov)\.[a-z]{2,3}$/.test(host) || host.includes('.go.') || host.includes('.gov.')) return 'government_portal';
  if (KNOWN_AGGREGATORS.some(agg => host === agg || host.endsWith('.' + agg))) return 'job_board_aggregator';
  return 'other_or_company_domain';
}

async function audit() {
  console.log('================================================================');
  console.log('🔬 COMPREHENSIVE RESEARCH: AGGREGATOR VS ACTUAL SOURCE SITE');
  console.log('================================================================\n');

  // 1. JOBS COMPREHENSIVE AUDIT
  console.log('--- 1. JOBS MODULE ANALYSIS ---');
  const allJobs = await sql`
    SELECT id, title, company_name, source_url, employer_url, is_aggregator_source, is_active,
           description, requirements, created_at
    FROM jobs
  `;
  console.log(`Total Jobs in Database: ${allJobs.length}`);

  const sourceDomainCounts = new Map();
  const employerDomainCounts = new Map();
  let identicalCount = 0;
  let missingEmployer = 0;
  let aggregatorSourceCount = 0;
  let directAtsSourceCount = 0;
  let govSourceCount = 0;
  let companySourceCount = 0;

  // Embedded URL inspection inside descriptions
  let jobsWithEmbeddedUrls = 0;
  let jobsWithEmbeddedAts = 0;
  let jobsWithEmbeddedEmail = 0;
  let jobsWithEmbeddedGoogleForm = 0;
  let jobsWithEmbeddedOfficialGov = 0;

  const embeddedAtsSamples = [];
  const embeddedEmailSamples = [];
  const embeddedGovSamples = [];

  for (const j of allJobs) {
    const sHost = extractHostname(j.source_url);
    const eHost = extractHostname(j.employer_url);

    sourceDomainCounts.set(sHost, (sourceDomainCounts.get(sHost) || 0) + 1);
    employerDomainCounts.set(eHost, (employerDomainCounts.get(eHost) || 0) + 1);

    if (j.source_url === j.employer_url) {
      identicalCount++;
    }
    if (!j.employer_url) {
      missingEmployer++;
    }

    const sType = classify(sHost);
    if (sType === 'job_board_aggregator') aggregatorSourceCount++;
    else if (sType === 'direct_ats') directAtsSourceCount++;
    else if (sType === 'government_portal') govSourceCount++;
    else companySourceCount++;

    // Scan description for application links/emails
    const text = (j.description || '') + ' ' + (j.requirements || '');
    
    // Check emails
    const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (emailMatches) {
      const validEmails = emailMatches.filter(e => 
        !e.includes('example.com') && 
        !e.includes('sentry.io') && 
        !e.includes('w3.org') &&
        !e.includes('schema.org') &&
        !e.includes('ajirayako') &&
        !e.includes('jobweb') &&
        !e.includes('hotnigerianjobs') &&
        !e.includes('brightermonday')
      );
      if (validEmails.length > 0) {
        jobsWithEmbeddedEmail++;
        if (embeddedEmailSamples.length < 5) {
          embeddedEmailSamples.push({ id: j.id, title: j.title, company: j.company_name, emails: validEmails.slice(0, 2) });
        }
      }
    }

    // Check URLs in text
    const urlMatches = text.match(/https?:\/\/[^\s<>"'{}|\\^`]+[^\s<>"'{}|\\^`.,;:]/g);
    if (urlMatches) {
      jobsWithEmbeddedUrls++;
      for (const u of urlMatches) {
        const uHost = extractHostname(u);
        if (uHost.includes('ajirayako') || uHost.includes('jobweb') || uHost.includes('hotnigerianjobs') || uHost.includes('brightermonday')) continue;

        if (ATS_PATTERNS.some(ats => uHost.includes(ats))) {
          jobsWithEmbeddedAts++;
          if (embeddedAtsSamples.length < 5) {
            embeddedAtsSamples.push({ id: j.id, title: j.title, company: j.company_name, atsUrl: u });
          }
          break;
        }
        if (/\.(go|gov)\.[a-z]{2,3}$/.test(uHost) || uHost.includes('.go.') || uHost.includes('.gov.')) {
          jobsWithEmbeddedOfficialGov++;
          if (embeddedGovSamples.length < 5) {
            embeddedGovSamples.push({ id: j.id, title: j.title, company: j.company_name, govUrl: u });
          }
          break;
        }
        if (uHost.includes('forms.gle') || uHost.includes('docs.google.com/forms') || uHost.includes('forms.office.com')) {
          jobsWithEmbeddedGoogleForm++;
          break;
        }
      }
    }
  }

  console.log(`\nJobs Source Classification Breakdown:`);
  console.log(`  - Job Board / Aggregator Portals: ${aggregatorSourceCount} (${(aggregatorSourceCount / allJobs.length * 100).toFixed(1)}%)`);
  console.log(`  - Direct ATS Platforms:           ${directAtsSourceCount} (${(directAtsSourceCount / allJobs.length * 100).toFixed(1)}%)`);
  console.log(`  - Official Government Portals:    ${govSourceCount} (${(govSourceCount / allJobs.length * 100).toFixed(1)}%)`);
  console.log(`  - Direct Company / Other Domains: ${companySourceCount} (${(companySourceCount / allJobs.length * 100).toFixed(1)}%)`);
  console.log(`  - Identical source_url & employer_url: ${identicalCount} (${(identicalCount / allJobs.length * 100).toFixed(1)}%)`);

  console.log(`\nTop 15 Source Domains in Jobs:`);
  const sortedSource = Array.from(sourceDomainCounts.entries()).sort((a, b) => b[1] - a[1]);
  for (const [dom, count] of sortedSource.slice(0, 15)) {
    console.log(`  • ${dom.padEnd(35)} : ${count.toString().padStart(5)} (${(count / allJobs.length * 100).toFixed(1)}%) [${classify(dom)}]`);
  }

  console.log(`\nDirect Application Artifacts Embedded in Job Descriptions:`);
  console.log(`  - Jobs containing embedded direct ATS links:          ${jobsWithEmbeddedAts}`);
  console.log(`  - Jobs containing embedded official Gov portal links:  ${jobsWithEmbeddedOfficialGov}`);
  console.log(`  - Jobs containing embedded Google/MS Forms:           ${jobsWithEmbeddedGoogleForm}`);
  console.log(`  - Jobs containing embedded valid application emails:  ${jobsWithEmbeddedEmail}`);
  console.log(`  - Total jobs with extractable direct apply channels:  ${jobsWithEmbeddedAts + jobsWithEmbeddedOfficialGov + jobsWithEmbeddedGoogleForm + jobsWithEmbeddedEmail}`);

  if (embeddedAtsSamples.length > 0) {
    console.log(`\nSample Extracted ATS Links:`);
    for (const s of embeddedAtsSamples) {
      console.log(`  - [${s.company}] ${s.title} -> ${s.atsUrl}`);
    }
  }
  if (embeddedGovSamples.length > 0) {
    console.log(`\nSample Extracted Gov Links:`);
    for (const s of embeddedGovSamples) {
      console.log(`  - [${s.company}] ${s.title} -> ${s.govUrl}`);
    }
  }
  if (embeddedEmailSamples.length > 0) {
    console.log(`\nSample Extracted Application Emails:`);
    for (const s of embeddedEmailSamples) {
      console.log(`  - [${s.company}] ${s.title} -> ${s.emails.join(', ')}`);
    }
  }

  // 2. TENDERS MODULE ANALYSIS
  console.log('\n--- 2. TENDERS MODULE ANALYSIS ---');
  const allTenders = await sql`
    SELECT id, title, contracting_authority, source_url, employer_url, status
    FROM tenders
  `;
  console.log(`Total Tenders in Database: ${allTenders.length}`);
  const tenderSources = new Map();
  for (const t of allTenders) {
    const host = extractHostname(t.source_url);
    tenderSources.set(host, (tenderSources.get(host) || 0) + 1);
  }
  console.log(`Tender Source Domains:`);
  for (const [dom, count] of Array.from(tenderSources.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  • ${dom.padEnd(35)} : ${count.toString().padStart(5)} (${(count / allTenders.length * 100).toFixed(1)}%)`);
  }

  // 3. BUSINESSES MODULE ANALYSIS
  console.log('\n--- 3. BUSINESSES MODULE ANALYSIS ---');
  const busTotal = await sql`SELECT count(*) as cnt FROM businesses`;
  const busWithDirectors = await sql`SELECT count(*) as cnt FROM businesses WHERE directors IS NOT NULL AND cardinality(directors) > 0`;
  const busWithRegDate = await sql`SELECT count(*) as cnt FROM businesses WHERE registration_date IS NOT NULL`;
  console.log(`Total Businesses in Database: ${busTotal[0].cnt}`);
  console.log(`Businesses with Verified Directors: ${busWithDirectors[0].cnt}`);
  console.log(`Businesses with Registration Date: ${busWithRegDate[0].cnt}`);

  // 4. COMPLIANCE MODULE ANALYSIS
  console.log('\n--- 4. COMPLIANCE REQUIREMENTS MODULE ANALYSIS ---');
  const compTotal = await sql`SELECT count(*) as cnt FROM compliance_requirements`;
  const compSources = await sql`
    SELECT 
      split_part(split_part(source_url, '//', 2), '/', 1) as domain,
      count(*) as cnt
    FROM compliance_requirements
    GROUP BY domain
    ORDER BY cnt DESC
    LIMIT 10
  `;
  console.log(`Total Compliance Requirements: ${compTotal[0].cnt}`);
  console.log(`Top Compliance Source Domains:`);
  for (const c of compSources) {
    console.log(`  • ${(c.domain || 'NO_SOURCE').padEnd(35)} : ${c.cnt}`);
  }

  // 5. SALARIES BENCHMARK MODULE ANALYSIS
  console.log('\n--- 5. SALARIES BENCHMARK MODULE ANALYSIS ---');
  const salTotal = await sql`SELECT count(*) as cnt FROM salary_submissions`;
  const salSources = await sql`
    SELECT 
      split_part(split_part(source_url, '//', 2), '/', 1) as domain,
      count(*) as cnt
    FROM salary_submissions
    GROUP BY domain
    ORDER BY cnt DESC
    LIMIT 10
  `;
  console.log(`Total Salary Submissions / Benchmarks: ${salTotal[0].cnt}`);
  console.log(`Top Salary Source Domains:`);
  for (const s of salSources) {
    console.log(`  • ${(s.domain || 'INTERNAL_USER_SUBMISSION').padEnd(35)} : ${s.cnt}`);
  }

  // 6. HEALTH MODULE ANALYSIS
  console.log('\n--- 6. HEALTH INTELLIGENCE MODULE ANALYSIS ---');
  const healthInds = await sql`SELECT count(*) as cnt FROM health_indicators`;
  const healthData = await sql`SELECT count(*) as cnt FROM health_data_points`;
  const healthSources = await sql`
    SELECT source, count(*) as cnt
    FROM health_data_points
    GROUP BY source
    ORDER BY cnt DESC
    LIMIT 10
  `;
  console.log(`Total Health Indicators: ${healthInds[0].cnt}`);
  console.log(`Total Health Data Points: ${healthData[0].cnt}`);
  console.log(`Top Health Data Sources:`);
  for (const h of healthSources) {
    console.log(`  • ${(h.source || 'OFFICIAL_REGISTRY').padEnd(35)} : ${h.cnt}`);
  }

  // 7. IN-DEPTH ANALYSIS OF APPLICATION CHANNELS PER TOP AGGREGATOR
  console.log('\n--- 7. HOW EACH AGGREGATOR STORES APPLICATION CHANNELS ---');
  const topAggregators = [
    'ajirayako.co.tz',
    'jobwebkenya.com',
    'brightermonday.co.ug',
    'hotnigerianjobs.com',
    'comms.southsudanngoforum.org'
  ];

  for (const agg of topAggregators) {
    const samples = await sql`
      SELECT id, title, company_name, description, requirements, source_url
      FROM jobs
      WHERE source_url LIKE ${'%' + agg + '%'}
      LIMIT 100
    `;

    let withEmail = 0;
    let withUrl = 0;
    let withPortal = 0;
    const urlSet = new Set();
    const emailSet = new Set();

    for (const s of samples) {
      const text = (s.description || '') + ' ' + (s.requirements || '');
      const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      const cleanEmails = emails.filter(e => !e.includes(agg) && !e.includes('example.com') && !e.includes('sentry.io'));
      if (cleanEmails.length > 0) {
        withEmail++;
        cleanEmails.slice(0, 2).forEach(e => emailSet.add(e));
      }

      const urls = text.match(/https?:\/\/[^\s<>"'{}|\\^`]+[^\s<>"'{}|\\^`.,;:]/g) || [];
      const cleanUrls = urls.filter(u => !u.includes(agg) && !u.includes('facebook') && !u.includes('twitter') && !u.includes('whatsapp') && !u.includes('linkedin'));
      if (cleanUrls.length > 0) {
        withUrl++;
        cleanUrls.slice(0, 2).forEach(u => urlSet.add(u));
      }

      if (/portal\.ajira\.go\.tz|ajira\.go\.tz|recruitment|careers|apply online|how to apply/i.test(text)) {
        withPortal++;
      }
    }

    console.log(`\nAggregator: ${agg} (Sampled 100 jobs)`);
    console.log(`  - Has direct employer application email: ${withEmail}%`);
    console.log(`  - Has external apply URL in description: ${withUrl}%`);
    console.log(`  - Mentions official portal or application section: ${withPortal}%`);
    if (emailSet.size > 0) {
      console.log(`  - Sample direct emails: ${Array.from(emailSet).slice(0, 3).join(', ')}`);
    }
    if (urlSet.size > 0) {
      console.log(`  - Sample direct URLs:   ${Array.from(urlSet).slice(0, 3).join(', ')}`);
    }
  }

  console.log('\n================================================================');
  console.log('🔬 AUDIT COMPLETE');
  console.log('================================================================');
}

audit()
  .catch(err => {
    console.error('Audit failed:', err);
  })
  .finally(async () => {
    await sql.end();
  });
