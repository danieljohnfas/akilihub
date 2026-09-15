import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { sql, eq, inArray, and, isNotNull } from 'drizzle-orm';

const AGGREGATOR_DOMAINS = [
  'www.corporatestaffing.co.ke',
  'theugandanjobline.com',
  'ajiraleo.co.tz',
  'minerals.co.com',
  'jobera.com',
  'www.tuko.co.ke',
  'opportunitiesforyoungkenyans.co.ke',
  'dmc-education.com',
  'mabumbe.tz',
  'kenyajobsearch.com',
  'www.elimuyako.co.tz',
  'semasocial.com',
  'campusbiz.co.ke',
  'www.mohasjobs.com',
  'sw.hine-crull-cared-exiler.com',
  'globalpublishers.co.tz',
  'truenorthafrica.com',
  'www.jobbasekenya.com',
  'career.zycto.com',
  'onnetpulse.com',
  'bebee.com',
  'www.ajirazote.co.tz',
  'sasaapply.com',
  'dailynews.co.tz',
  'www.the-star.co.ke',
  'www.ajirazetu.tz',
  'newslinetz.com',
  'myjobmag.co.ke',
  'www.myjobmag.co.ke',
  'zoomtanzania.com',
  'www.zoomtanzania.com'
];

async function main() {
  console.log('🧹 Cleaning up fake employer URLs from known aggregators using Drizzle...');
  
  const result = await db.update(jobs)
    .set({
      employerUrl: null,
      isAggregatorSource: true,
      needsAiExtraction: true
    })
    .where(
      and(
        isNotNull(jobs.employerUrl),
        sql`regexp_replace(${jobs.sourceUrl}, '^https?://([^/]+).*', '\\1') IN (${sql.join(AGGREGATOR_DOMAINS.map(d => sql`${d}`), sql`, `)})`,
        sql`regexp_replace(${jobs.employerUrl}, '^https?://([^/]+).*', '\\1') = regexp_replace(${jobs.sourceUrl}, '^https?://([^/]+).*', '\\1')`
      )
    )
    .returning({ id: jobs.id });
    
  console.log(`✅ Success! Cleaned up ${result.length} jobs with fake employer URLs from aggregators.`);
  process.exit(0);
}

main().catch(console.error);
