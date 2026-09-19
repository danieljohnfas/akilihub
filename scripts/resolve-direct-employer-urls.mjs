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

const ATS_PATTERNS = [
  'greenhouse.io', 'lever.co', 'workdayjobs.com', 'workdaysite.com', 'bamboohr.com',
  'smartrecruiters.com', 'taleo.net', 'recruitee.com', 'applytojob.com', 'ashbyhq.com',
  'personio.', 'teamtailor.com', 'erecruit.co', 'icims.com', 'jobvite.com', 'oraclecloud.com',
  'zohorecruit.com'
];

const KNOWN_AGGREGATORS = [
  'ajirayako.co.tz', 'mwanampotevu.co.tz', 'jobwebkenya.com', 'jobwebghana.com',
  'jobwebzambia.com', 'jobwebethiopia.com', 'jobwebgroup.com', 'brightermonday.co.ug',
  'brightermonday.co.ke', 'brightermonday.co.tz', 'brightermonday.com', 'hotnigerianjobs.com',
  'mediacongo.net', 'jobinrwanda.com', 'jobinburundi.com', 'hiiraan.com', 'fuzu.com',
  'myjobmag.co.ke', 'myjobmag.com', 'kenyajob.com', 'ugandajob.com', 'tanzaniajobs.co.tz',
  'ethiojobs.net', 'reliefweb.int', 'unjobs.org', 'devex.com', 'impactpool.org',
  'comms.southsudanngoforum.org'
];

function isAggregator(urlStr) {
  if (!urlStr) return false;
  try {
    const host = new URL(urlStr.trim()).hostname.replace(/^www\./, '').toLowerCase();
    return KNOWN_AGGREGATORS.some(agg => host === agg || host.endsWith('.' + agg));
  } catch {
    return false;
  }
}

function extractDirectEndpoint(text, companyName) {
  if (!text) return null;

  // 1. Look for direct ATS links
  const urlMatches = text.match(/https?:\/\/[^\s<>"'{}|\\^`]+[^\s<>"'{}|\\^`.,;:]/g) || [];
  for (const u of urlMatches) {
    try {
      const parsed = new URL(u);
      const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
      if (ATS_PATTERNS.some(ats => host.includes(ats))) {
        return u;
      }
      if (/\.(go|gov)\.[a-z]{2,3}$/.test(host) || host.includes('portal.ajira.go.tz') || host.includes('psc.go.tz')) {
        return u;
      }
      if (host.includes('forms.gle') || host.includes('docs.google.com/forms') || host.includes('forms.office.com')) {
        return u;
      }
    } catch {}
  }

  // 2. Look for valid direct application emails
  const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const cleanEmails = emailMatches.filter(e => {
    const lower = e.toLowerCase();
    if (lower.includes('example.com') || lower.includes('sentry.io') || lower.includes('w3.org') || lower.includes('schema.org')) return false;
    if (KNOWN_AGGREGATORS.some(agg => lower.includes(agg))) return false;
    if (lower.includes('wordpress') || lower.includes('domain.com') || lower.includes('email.com')) return false;
    return true;
  });

  if (cleanEmails.length > 0) {
    // Prefer recruitment/careers/hr emails if present
    const hrEmail = cleanEmails.find(e => /recruit|career|job|apply|hr|talent|hiring|work/i.test(e)) || cleanEmails[0];
    return `mailto:${hrEmail}`;
  }

  return null;
}

async function resolveDirectUrls() {
  console.log('================================================================');
  console.log('🔧 DIRECT EMPLOYER URL RESOLVER & AGGREGATOR DETACHER');
  console.log('================================================================\n');

  const allJobs = await sql`
    SELECT id, title, company_name, source_url, employer_url, description, requirements, is_aggregator_source
    FROM jobs
  `;
  console.log(`Auditing and resolving direct endpoints for ${allJobs.length} jobs...`);

  let updatedToAts = 0;
  let updatedToEmail = 0;
  let markedAsAggregator = 0;
  let clearedAggregatorEmployerUrl = 0;

  for (const j of allJobs) {
    const sIsAgg = isAggregator(j.source_url);
    const eIsAgg = isAggregator(j.employer_url);
    const text = (j.description || '') + ' ' + (j.requirements || '');

    const directEndpoint = extractDirectEndpoint(text, j.company_name);

    let newEmployerUrl = j.employer_url;
    let newIsAggregatorSource = sIsAgg;

    if (directEndpoint) {
      newEmployerUrl = directEndpoint;
      if (directEndpoint.startsWith('mailto:')) {
        updatedToEmail++;
      } else {
        updatedToAts++;
      }
    } else if (eIsAgg || j.employer_url === j.source_url) {
      // If no direct link exists in the text and employer_url points to the aggregator,
      // clear employer_url to null so the frontend doesn't link to the aggregator!
      newEmployerUrl = null;
      clearedAggregatorEmployerUrl++;
    }

    if (sIsAgg && !j.is_aggregator_source) {
      markedAsAggregator++;
    }

    if (newEmployerUrl !== j.employer_url || newIsAggregatorSource !== j.is_aggregator_source) {
      await sql`
        UPDATE jobs
        SET 
          employer_url = ${newEmployerUrl},
          is_aggregator_source = ${newIsAggregatorSource},
          updated_at = NOW()
        WHERE id = ${j.id}
      `;
    }
  }

  console.log('\n--- RESOLUTION SUMMARY ---');
  console.log(`Jobs updated to Direct ATS / Portal:              ${updatedToAts}`);
  console.log(`Jobs updated to Direct Official Email (mailto:):  ${updatedToEmail}`);
  console.log(`Aggregator employer_url detached / cleared:      ${clearedAggregatorEmployerUrl}`);
  console.log(`Jobs flagged correctly with is_aggregator_source: ${markedAsAggregator}`);
  console.log('\n================================================================');
  console.log('✅ RESOLVER RUN COMPLETE');
  console.log('================================================================');
}

resolveDirectUrls()
  .catch(err => console.error('Resolution error:', err))
  .finally(async () => {
    await sql.end();
  });
