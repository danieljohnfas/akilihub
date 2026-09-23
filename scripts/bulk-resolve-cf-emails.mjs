import { createRequire } from 'module';
import { join } from 'path';

const projectRoot = 'c:/Users/nnm/Documents/projects/akilihub';
const require = createRequire(join(projectRoot, 'package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: join(projectRoot, '.env.local') });

const cheerio = require('cheerio');
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 10, prepare: false });

function decodeCloudflareEmail(hex) {
  if (!hex || hex.length < 4) return null;
  try {
    const r = parseInt(hex.substring(0, 2), 16);
    let email = '';
    for (let i = 2; i < hex.length; i += 2) {
      email += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16) ^ r);
    }
    return email && email.includes('@') && email.includes('.') ? email.trim() : null;
  } catch {
    return null;
  }
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'aol.com', 'icloud.com', 'mail.com', 'zoho.com', 'protonmail.com'
]);

async function processJob(job) {
  if (!job.source_url) return null;

  const html = await fetchPage(job.source_url);
  if (!html) return null;

  const $ = cheerio.load(html);
  const emails = [];

  $('[data-cfemail]').each((_, el) => {
    const hex = $(el).attr('data-cfemail');
    const dec = decodeCloudflareEmail(hex);
    if (dec) emails.push(dec);
  });

  $('a[href*="/email-protection#"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      const hex = href.split('#')[1];
      const dec = decodeCloudflareEmail(hex);
      if (dec) emails.push(dec);
    }
  });

  // Extract application ATS links
  let directAtsUrl = null;
  const atsDomains = ['workable.com', 'greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'bamboohr.com', 'smartrecruiters.com', 'recruitee.com', 'forms.gle'];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && atsDomains.some(d => href.toLowerCase().includes(d))) {
      directAtsUrl = href;
    }
  });

  const uniqueEmails = Array.from(new Set(emails));
  if (uniqueEmails.length === 0 && !directAtsUrl) return null;

  let desc = job.description || '';
  let reqs = job.requirements || '';
  const primaryEmail = uniqueEmails[0];

  if (primaryEmail) {
    desc = desc.replace(/\[email protected\]/g, primaryEmail);
    reqs = reqs.replace(/\[email protected\]/g, primaryEmail);
  }

  // Deduce employer website from email domain if corporate
  let resolvedEmployer = job.employer_url;
  if (!resolvedEmployer) {
    if (directAtsUrl) {
      resolvedEmployer = directAtsUrl;
    } else if (primaryEmail) {
      const domain = primaryEmail.split('@')[1]?.toLowerCase();
      if (domain && !PUBLIC_EMAIL_DOMAINS.has(domain)) {
        resolvedEmployer = `https://${domain}`;
      }
    }
  }

  return {
    id: job.id,
    desc,
    reqs,
    employerUrl: resolvedEmployer,
    decodedEmail: primaryEmail || null,
  };
}

async function run() {
  console.log('Resolving Cloudflare emails and direct employer URLs for active jobs...\n');

  const rows = await sql`
    SELECT id, title, source_url, description, requirements, employer_url
    FROM jobs
    WHERE (description LIKE '%[email protected]%' OR requirements LIKE '%[email protected]%')
      AND is_active = true
      AND source_url IS NOT NULL
    ORDER BY id
  `;

  console.log(`Total active jobs with [email protected]: ${rows.length}`);
  const CONCURRENCY = 12;
  let processed = 0;
  let emailsResolved = 0;
  let employersResolved = 0;
  const startTime = Date.now();

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const chunk = rows.slice(i, i + CONCURRENCY);
    const results = await Promise.all(chunk.map(processJob));

    const updates = results.filter(Boolean);
    if (updates.length > 0) {
      await Promise.all(updates.map(u => sql`
        UPDATE jobs SET
          description = ${u.desc},
          requirements = ${u.reqs},
          employer_url = COALESCE(${u.employerUrl}, employer_url),
          updated_at = NOW()
        WHERE id = ${u.id}
      `));

      for (const u of updates) {
        if (u.decodedEmail) emailsResolved++;
        if (u.employerUrl) employersResolved++;
      }
    }

    processed += chunk.length;
    const elapsed = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const rate = (processed / elapsed).toFixed(1);
    const remaining = rows.length - processed;
    const etaSec = Math.round(remaining / Math.max(0.1, processed / elapsed));

    console.log(`[CF Resolver] ${processed}/${rows.length} (${((processed/rows.length)*100).toFixed(1)}%) | Emails Decoded: ${emailsResolved} | Employers Resolved: ${employersResolved} | Rate: ${rate} jobs/s | ETA: ${etaSec}s`);
  }

  console.log(`\n\n🎉 Cloudflare Email & Employer Resolution Complete!`);
  console.log(`   Total Processed:     ${processed}`);
  console.log(`   Emails Decoded:      ${emailsResolved}`);
  console.log(`   Employers Resolved:  ${employersResolved}`);

  await sql.end();
}

run().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
