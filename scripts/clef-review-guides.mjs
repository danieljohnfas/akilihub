import { score, noul, choice } from '@typesafe-ai/sdk';
import { systemOne } from './clef-client.mjs';
import postgres from 'postgres';
import dotenv from 'dotenv';
import * as cheerio from 'cheerio';
dotenv.config({ path: '.env.local' });

const jev = { systemOne };
const sql = postgres(process.env.DATABASE_URL);

async function run() {
  console.log('Fetching guides...');
  const guidesList = await sql`SELECT id, title, summary, content_html FROM guides`;
  
  let updated = 0;
  for (const guide of guidesList) {
    console.log(`Processing guide: ${guide.title}`);
    
    // Calculate reading time
    const $ = cheerio.load(guide.content_html || '');
    const textContent = $.text();
    const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200)); // 200 WPM

    const result = await jev.systemOne({
      state: { title: guide.title, summary: guide.summary },
      questions: {
        quality: score(
          "Rate the quality of the guide based on its title and summary",
          ["Awful", "Poor", "Fair", "Good", "Excellent", "Perfect"]
        )
      }
    });

    const qualityScore = result.answers.quality.score;
    
    await sql`UPDATE guides SET reading_time_minutes = ${readingTimeMinutes} WHERE id = ${guide.id}`;
    updated++;
    
    console.log(`Updated ${guide.title}: reading_time_minutes=${readingTimeMinutes}, quality_score=${qualityScore.toFixed(2)}`);
  }
  
  console.log(`Finished updating ${updated} guides.`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
