import { db } from '../src/lib/db/client';
import { jobs } from '../src/lib/db/schema/jobs';
import { isNotNull, like, eq } from 'drizzle-orm';
import { fetchHtml, htmlToTextEnriched } from '../src/lib/scrapers/compliance-base';

async function run() {
  console.log('[DirectScraper] Booting high-speed direct HTML scraper...');
  
  // Find jobs that have the placeholder description
  const pendingJobs = await db.select().from(jobs)
    .where(like(jobs.description, '%Detailed job description is available%'));
    
  console.log(`[DirectScraper] Found ${pendingJobs.length} jobs with placeholder descriptions.`);
  
  let processed = 0;
  const CONCURRENT = 10;
  
  for (let i = 0; i < pendingJobs.length; i += CONCURRENT) {
    const batch = pendingJobs.slice(i, i + CONCURRENT);
    
    await Promise.all(batch.map(async (job) => {
      if (!job.sourceUrl) return;
      try {
        const html = await fetchHtml(job.sourceUrl);
        if (html) {
          const { text } = await htmlToTextEnriched(html, job.sourceUrl);
          
          if (text && text.length > 50) {
            // Clean up the text a bit (remove excessive newlines and spaces)
            const cleanText = text.replace(/\n\s*\n/g, '\n\n').trim().substring(0, 15000);
            
            await db.update(jobs)
              .set({ 
                description: cleanText,
                updatedAt: new Date()
              })
              .where(eq(jobs.id, job.id));
          } else {
            console.log(`[DirectScraper] Skip ${job.id} - No usable text found.`);
          }
        }
      } catch (e: any) {
        console.warn(`[DirectScraper] Failed to fetch ${job.sourceUrl}: ${e.message}`);
      }
    }));
    
    processed += batch.length;
    console.log(`[DirectScraper] Processed ${processed}/${pendingJobs.length} jobs...`);
  }
  
  console.log('[DirectScraper] Complete! All placeholder descriptions replaced with actual website data.');
  process.exit(0);
}

run();
