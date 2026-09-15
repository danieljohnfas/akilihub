import { db } from './src/lib/db/client';
import { jobs } from './src/lib/db/schema/jobs';
import { fetchHtml } from './src/lib/scrapers/compliance-base';
import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import { isNotNull, desc } from 'drizzle-orm';

function getStructuralFingerprint(html: string) {
  const $ = cheerio.load(html);
  
  $('*').contents().filter(function() {
    return this.type === 'text' || this.type === 'comment';
  }).remove();
  
  $('script, style, meta, link, noscript').remove();
  
  return crypto.createHash('md5').update($('body').html() || '').digest('hex');
}

async function run() {
  console.log('[Architect] Fetching top 20 jobs to test structural clustering...');
  const sampleJobs = await db.select().from(jobs).where(isNotNull(jobs.sourceUrl)).orderBy(desc(jobs.postedDate)).limit(20);
  
  const clusters = new Map<string, { count: number, exampleUrl: string }>();
  
  let processed = 0;
  for (const job of sampleJobs) {
    if (!job.sourceUrl) continue;
    try {
      const html = await fetchHtml(job.sourceUrl);
      if (html) {
        const hash = getStructuralFingerprint(html);
        if (!clusters.has(hash)) {
          clusters.set(hash, { count: 1, exampleUrl: job.sourceUrl });
        } else {
          clusters.get(hash)!.count++;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch', job.sourceUrl);
    }
    processed++;
    console.log('Processed ' + processed + '/20');
  }
  
  console.log('\n[Architect] Found ' + clusters.size + ' unique structural templates among 20 jobs.');
  for (const [hash, data] of clusters.entries()) {
    console.log('- Template ' + hash + ': ' + data.count + ' jobs. (Example: ' + data.exampleUrl + ')');
  }
  process.exit(0);
}

run();
