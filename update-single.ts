import { db } from './src/lib/db/client';
import { jobs } from './src/lib/db/schema/jobs';
import { eq } from 'drizzle-orm';
import { fetchHtml, htmlToTextEnriched } from './src/lib/scrapers/compliance-base';

async function main() {
  const jobId = 'e1daa67f-15c1-46fa-baa6-531ade56112a';
  console.log(`Fetching job ${jobId}...`);
  
  const result = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (result.length === 0) {
    console.log('Job not found!');
    process.exit(1);
  }
  
  const job = result[0];
  console.log(`Source URL: ${job.sourceUrl}`);
  
  const html = await fetchHtml(job.sourceUrl);
  if (!html) {
    console.log('Could not fetch HTML.');
    process.exit(1);
  }
  
  const { text } = await htmlToTextEnriched(html, job.sourceUrl);
  const cleanText = text.replace(/\n\s*\n/g, '\n\n').trim().substring(0, 15000);
  
  await db.update(jobs)
    .set({ description: cleanText, updatedAt: new Date() })
    .where(eq(jobs.id, jobId));
    
  console.log('--- EXTRACTED TEXT ---');
  console.log(cleanText.substring(0, 800) + '...');
  console.log('----------------------');
  console.log('Successfully updated the database!');
  process.exit(0);
}
main();
