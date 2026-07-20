import { config } from 'dotenv';
config({ path: '.env.local' });

import { generateObjectWithFallback } from "../src/lib/ai/router";
import { db } from "../src/lib/db/client";
import { guides } from "../src/lib/db/schema/guides";
import { z } from "zod";
import { searchGoogle } from "../src/lib/scrapers/broad-search-engine";

const TROPICS = [
  "Tanzania health data trends DHIS2",
  "Digital health implementations in Kenyan public hospitals",
  "Uganda electronic medical records rollout",
  "Rwanda primary healthcare digitization trends",
  "Ethiopia health information systems interoperability",
  "Tuberculosis incidence and reporting in East Africa",
  "Maternal health data tracking via HMIS in Tanzania",
  "Malaria case reporting accuracy in Uganda",
  "FHIR and HL7 standards adoption in East African healthcare",
  "Community health worker data collection tools in Kenya",
  "Kenya business compliance changes KRA eTIMS",
  "Uganda tax registration updates URSB",
  "Tanzania BRELA company registration guide",
  "Rwanda RDB business setup and compliance",
  "Ethiopia customs and import tax regulations",
  "Navigating PAYE and NSSF deductions in Kenya",
  "Tanzania TRA VAT registration requirements",
  "Foreign business ownership rules in Uganda",
  "Data protection and privacy laws in East Africa",
  "Work permit application process in Rwanda",
  "PPRA Tanzania procurement guidelines update",
  "How SMEs can win government tenders in Kenya",
  "Uganda PPDA bidding process for contractors",
  "Rwanda e-Procurement system (Umucyo) guide",
  "Common mistakes when bidding for East African government tenders",
  "Requirements for pre-qualification in Kenyan tenders",
  "Tanzania local content regulations in procurement",
  "Understanding tender security and bid bonds in Uganda",
  "Public-private partnerships in Ethiopian infrastructure projects",
  "Women and youth in procurement policies (AGPO) in Kenya",
];

const GuideContentSchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  contentHtml: z.string(),
  category: z.enum(['procurement', 'health', 'compliance', 'jobs', 'salaries', 'general']),
  keywords: z.string(),
  readingTimeMinutes: z.number().int(),
});

async function runSeed() {
  // Limit to 15 guides for the initial seed to prevent hitting hard daily API limits across all models
  const subset = TROPICS.slice(0, 15);
  console.log(`Starting to generate ${subset.length} guides...`);

  // Process sequentially to avoid rate limits
  for (let i = 0; i < subset.length; i++) {
    const topic = subset[i];
    console.log(`\n[${i + 1}/${subset.length}] Generating guide for: "${topic}"...`);

    try {
      // 1. Search for context
      console.log(`  -> Searching Google for context...`);
      const searchResults = await searchGoogle(topic, 3);
      console.log(`  -> Found ${searchResults.length} references.`);

      // 2. Generate content
      console.log(`  -> Calling AI to write article (this takes a moment)...`);
      const prompt = `You are the lead editor for AkiliBrain, East Africa's Professional Intelligence Platform.
Your audience consists of professionals, contractors, health workers, and developers in Kenya, Tanzania, Uganda, Rwanda, and Ethiopia.
Write a deep-dive, professional guide/article about the following topic: "${topic}".

Use insights that reflect East African realities. 
Here are some reference URLs found on this topic recently: ${searchResults.join(', ')}.

Return the response strictly adhering to the JSON schema. Ensure the HTML content is well-structured and uses semantic tags. Make it long, detailed, and highly valuable (1000+ words).`;

      const result = await generateObjectWithFallback({
        prompt,
        schema: GuideContentSchema,
        temperature: 0.7,
        maxTokens: 4000,
      });

      const guideData = result.object;

      // 3. Upsert to DB
      console.log(`  -> Saving guide "${guideData.title}" to database...`);
      await db.insert(guides).values({
        slug: guideData.slug,
        title: guideData.title,
        summary: guideData.summary,
        contentHtml: guideData.contentHtml,
        category: guideData.category,
        trendTopic: topic,
        keywords: guideData.keywords,
        readingTimeMinutes: guideData.readingTimeMinutes,
        isPublished: true,
      }).onConflictDoUpdate({
        target: guides.slug,
        set: {
          title: guideData.title,
          summary: guideData.summary,
          contentHtml: guideData.contentHtml,
          category: guideData.category,
          trendTopic: topic,
          keywords: guideData.keywords,
          readingTimeMinutes: guideData.readingTimeMinutes,
          updatedAt: new Date(),
        }
      });
      console.log(`  -> ✅ Done.`);

    } catch (error) {
      console.log(`  -> ❌ Error generating guide for topic: ${topic}`, error);
    }
    
    // Add a 10 second delay between requests to let the AI models cool down
    console.log(`  -> Waiting 10 seconds before next generation to prevent rate limits...`);
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  console.log(`\nFinished generating guides!`);
  process.exit(0);
}

runSeed();
