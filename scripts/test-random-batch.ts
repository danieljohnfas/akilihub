import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as cheerio from 'cheerio';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const conn = postgres(dbUrl, {
  ssl: dbUrl.includes('supabase.com') || dbUrl.includes('neon.tech') || dbUrl.includes('pooler.supabase.com') ? 'require' : false,
  max: 5,
});
const db = drizzle(conn);

const ATS_DOMAINS = [
  'talentclue.com',
  'myworkdayjobs.com',
  'myworkdaysite.com',
  'smartrecruiters.com',
  'greenhouse.io',
  'lever.co',
  'bamboohr.com',
  'recruitee.com',
  'taleo.net',
  'successfactors.com',
  'successfactors.eu',
  'workable.com',
  'ashbyhq.com',
  'jobylon.com',
  'personio.com',
  'personio.de',
  'applytojob.com',
  'icims.com',
  'jobvite.com',
  'teamtailor.com',
  'applicantpro.com',
  'pinpointhq.com',
  'freshteam.com',
  'zohorecruit.com',
  'cvwarehouse.com',
  'msf-applications.org',
  'careers.un.org',
  'jobs.unicef.org',
];

const JUNK_DOMAINS = [
  'wordpress.org',
  'wix.com',
  'wixstudio.com',
  'instagram.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'youtube.com',
  'youtu.be',
  'tiktok.com',
  'whatsapp.com',
  'wa.me',
  'telegram.org',
  't.me',
  'iubenda.com',
  'cookiebot.com',
  'base44.app',
  'mysalaryscale.com',
  'apexaccountingschool.com',
  'mail.google.com',
  'compose.mail.yahoo.com',
  'google.com',
  'play.google.com',
  'apple.com',
  'apps.apple.com',
  'cloudflare.com',
  'myjobmag.co.ke',
  'myjobmag.com',
  'myjobmag.co.tz',
  'myjobmag.co.ug',
  'myjobmag.co.rw',
  'ngojobsinafrica.com',
  'africareers.net',
  'unjobs.org',
  'unjobs.media',
  'houseinrwanda.com',
  'hrms.rw',
  'alljobspo.com',
  'jobinrwanda.com',
  'jobinuganda.com',
  'jobintanzania.com',
  'jobinkenya.com',
  'jobinburundi.com',
  'jobincamer.com',
  'jobenrdc.com',
  'geezjobs.com',
  'brightermonday.co.ke',
  'brightermonday.co.ug',
  'brightermonday.co.tz',
  'brightermonday.com',
  'jobwebrwanda.com',
  'ethiopianreporterjobs.com',
  'ajiriwa.net',
  'zoomtanzania.net',
  'ethio-jobs.net.et',
  'ethiongojobs.com',
  'impactpool.org',
  'reliefweb.int',
  'devex.com',
  'pachodo.org',
  'sudanjob.net',
  'greattanzaniajobs.com',
  'greatkenyanjobs.com',
  'greatugandajobs.com',
  'greatethiopianjobs.com',
  'greatrwandajobs.com',
  'greatdrcjobs.com',
  'akilibrain.com',
  'hahu.jobs',
  'developmentaid.org',
  'caglobalint.com',
  'dailyremote.com',
  'untalent.org',
  'cmd.cd',
  'advance-africa.com',
  'codingkenya.com',
  'lafabsolution.com',
  'tanzajob.com',
  'shortlist.net',
  'cvmkr.com',
];

function isCleanEmployerUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    
    // Block static asset files
    if (/\.(css|js|woff2?|ttf|eot|svg|png|jpe?g|gif|webp|ico|map)$/i.test(pathname)) {
      return false;
    }

    // Block CDNs & libraries
    if (hostname.includes('bootstrapcdn') || hostname.includes('cdnjs') || hostname.includes('jsdelivr') || hostname.includes('unpkg') || hostname.includes('googleapis') || hostname.includes('gstatic')) {
      return false;
    }

    // Check junk / aggregator domains
    if (JUNK_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))) {
      return false;
    }
    // Must have a real domain structure
    if (!hostname.includes('.')) return false;
    return true;
  } catch {
    return false;
  }
}

async function searchEmployerViaSerper(company: string, title: string): Promise<string | null> {
  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey || !company || company.toLowerCase() === 'unknown') return null;

  const cleanCompany = company.replace(/\s+(ltd|limited|inc|plc|corp|group|corporation|ngo|foundation)\.?$/i, '').trim();

  // 1. ATS Search
  const atsQuery = `site:talentclue.com OR site:myworkdayjobs.com OR site:greenhouse.io OR site:lever.co OR site:bamboohr.com OR site:smartrecruiters.com OR site:recruitee.com OR site:taleo.net OR site:successfactors.com OR site:workable.com OR site:ashbyhq.com OR site:applytojob.com "${cleanCompany}" "${title}"`;
  try {
    const resAts = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: atsQuery, num: 3 }),
    });
    const dataAts = await resAts.json();
    if (dataAts.organic && Array.isArray(dataAts.organic)) {
      for (const item of dataAts.organic) {
        if (item.link && isCleanEmployerUrl(item.link)) {
          return item.link;
        }
      }
    }
  } catch (e) {}

  // 2. Direct Career Search
  const directQuery = `"${cleanCompany}" "${title}" (careers OR apply OR vacancy OR "job opening")`;
  try {
    const resDirect = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: directQuery, num: 5 }),
    });
    const dataDirect = await resDirect.json();
    if (dataDirect.organic && Array.isArray(dataDirect.organic)) {
      for (const item of dataDirect.organic) {
        if (item.link && isCleanEmployerUrl(item.link)) {
          return item.link;
        }
      }
    }
  } catch (e) {}

  return null;
}

async function resolveJob(job: { id: string; title: string; company: string; sourceUrl: string }) {
  const { title, company, sourceUrl } = job;
  const hostname = new URL(sourceUrl).hostname.replace(/^www\./, '').toLowerCase();
  
  const isAts = ATS_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  const isGov = /\.(go|gov)\.[a-z]{2,3}$/.test(hostname) || hostname.endsWith('ppra.go.tz') || hostname.endsWith('psc.go.ke') || hostname.endsWith('lmis.rw');

  if (isAts || isGov) {
    return { url: sourceUrl, method: isAts ? 'direct_ats' : 'direct_gov' };
  }

  const isAgg = JUNK_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  if (!isAgg && isCleanEmployerUrl(sourceUrl)) {
    return { url: sourceUrl, method: 'direct_employer' };
  }

  // Fetch HTML
  try {
    const resp = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    });
    if (resp.ok) {
      const html = await resp.text();
      const $ = cheerio.load(html);
      $('script, style, head, nav, footer, header, noscript, iframe').remove();

      const candidates: Array<{ url: string; score: number }> = [];
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href')?.trim() || '';
        const text = $(el).text().trim().toLowerCase();
        let resolved = '';
        try { resolved = new URL(href, sourceUrl).href; } catch { return; }
        if (!isCleanEmployerUrl(resolved)) return;

        let score = 1;
        const resHost = new URL(resolved).hostname.replace(/^www\./, '').toLowerCase();
        if (ATS_DOMAINS.some(d => resHost === d || resHost.endsWith('.' + d))) score += 20;
        if (/\.(go|gov)\.[a-z]{2,3}$/.test(resHost)) score += 15;
        if (/\.(pdf|docx?)$/i.test(resolved)) score += 10;
        if (text.includes('apply') || text.includes('original') || text.includes('official') || text.includes('portal')) score += 5;
        candidates.push({ url: resolved, score });
      });

      const bodyText = $('body').text();
      const plainUrls = bodyText.match(/https?:\/\/[^\s"'<>)]+/g) || [];
      for (const pUrl of plainUrls) {
        if (isCleanEmployerUrl(pUrl)) {
          let score = 1;
          const pHost = new URL(pUrl).hostname.replace(/^www\./, '').toLowerCase();
          if (ATS_DOMAINS.some(d => pHost === d || pHost.endsWith('.' + d))) score += 20;
          if (/\.(go|gov)\.[a-z]{2,3}$/.test(pHost)) score += 15;
          candidates.push({ url: pUrl, score });
        }
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        return { url: candidates[0].url, method: 'html_extraction' };
      }
    }
  } catch (e) {}

  // Search Fallback
  const searched = await searchEmployerViaSerper(company, title);
  if (searched) {
    return { url: searched, method: 'search_resolution' };
  }

  return { url: null, method: 'unresolved' };
}

async function runBatch() {
  const sample = await db.execute(sql`
    SELECT id, title, company_name, source_url
    FROM jobs
    WHERE employer_url IS NULL
    ORDER BY random()
    LIMIT 20;
  `);

  console.log(`Testing batch of ${sample.length} random unresolved jobs...\n`);
  for (const r of sample) {
    const job = {
      id: r.id as string,
      title: (r.title as string) || 'Unknown',
      company: (r.company_name as string) || 'Unknown',
      sourceUrl: r.source_url as string,
    };
    const res = await resolveJob(job);
    console.log(`[${job.company.slice(0, 30)}] "${job.title.slice(0, 45)}"`);
    console.log(`  Source: ${job.sourceUrl}`);
    console.log(`  Output: ${res.url ? `✅ [${res.method}] ${res.url}` : '❌ (unresolved)'}\n`);
  }
  process.exit(0);
}

runBatch();
