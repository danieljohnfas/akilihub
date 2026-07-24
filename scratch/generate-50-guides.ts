import { config } from 'dotenv';
config({ path: '.env.local' });
import { db } from "@/lib/db/client";
import { guides } from "@/lib/db/schema/guides";
import { generateObjectWithFallback } from "@/lib/ai/router";
import { searchGoogle } from "@/lib/scrapers/broad-search-engine";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";

const TROPICS = [
  // Health Data & Systems
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
  
  // Compliance & Business
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
  
  // Procurement & Tenders
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

  // Jobs & Tech
  "East Africa tech salaries trends 2026",
  "Demand for software engineers in Nairobi",
  "Remote work opportunities for East African developers",
  "How to structure a CV for the Tanzanian job market",
  "Uganda's growing tech hub and startup ecosystem",
  "Rwanda Kigali Innovation City job trends",
  "Data science and AI job demand in East Africa",
  "Nursing and healthcare professional salaries in Kenya",
  "Accounting and finance job market in Tanzania",
  "Navigating technical interviews in East African tech companies",
  "Project management certifications valued in Uganda",
  "Entry-level job opportunities for graduates in Kenya",
  "The impact of AI on East African job markets",
  "Freelancing and the gig economy in Tanzania",
  "Ethiopia's telecom liberalization and new tech jobs",
  "Impact of mobile money (M-Pesa) on East African business",
  "Agri-tech startups revolutionizing farming in Kenya and Uganda",
  "Renewable energy careers and solar jobs in East Africa",
  "Cybersecurity threats and compliance for Tanzanian banks",
  "E-commerce logistics and supply chain roles in Rwanda"
];

const GuideContentSchema = z.object({
  slug: z.string().describe("URL-friendly slug, e.g. tanzania-tb-incidence-explained"),
  title: z.string().describe("Engaging, professional title for the guide"),
  summary: z.string().describe("1-2 sentence meta description/summary"),
  contentHtml: z.string().describe("Full HTML body of the guide. Use <article>, <section>, <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>. Do NOT include <h1> or outer layout wrappers. Use Tailwind classes like 'space-y-4' and 'text-muted-foreground' where appropriate. Make it professional, insightful, and data-driven."),
  category: z.enum(['procurement', 'health', 'compliance', 'jobs', 'salaries', 'general']),
  keywords: z.string().describe("Comma-separated keywords for SEO"),
  readingTimeMinutes: z.number().int(),
});

async function main() {
  while (true) {
    // 1. Current count Check
    const currentCount = await db.select({ id: guides.id }).from(guides);
    if (currentCount.length >= 50) {
      console.log(`Successfully reached ${currentCount.length} guides. Stopping!`);
      break;
    }

    // 2. Find which topics we have already covered
    const existingGuides = await db.select({ trendTopic: guides.trendTopic }).from(guides);
    const coveredTopics = new Set(existingGuides.map(g => g.trendTopic));

    // 3. Find remaining topics
    const remainingTopics = TROPICS.filter(t => !coveredTopics.has(t));
    if (remainingTopics.length === 0) {
       console.log("No remaining topics but count is < 50. This shouldn't happen unless TROPICS length < 50.");
       break;
    }

    console.log(`\n===========================================`);
    const topic = remainingTopics[0];
    console.log(`Generating Guide: "${topic}"`);
    console.log(`Current Count: ${currentCount.length} / 50`);
    
    try {
      console.log(`[1/3] Searching Google for recent context...`);
      const searchResults = await searchGoogle(topic, 5);
      
      console.log(`[2/3] Generating content with AI Router...`);
      const prompt = `You are the lead editor for AkiliBrain, East Africa's Professional Intelligence Platform.
Your audience consists of professionals, contractors, health workers, and developers in Kenya, Tanzania, Uganda, Rwanda, and Ethiopia.
Write a deep-dive, professional guide/article about the following topic: "${topic}".

Use insights that reflect East African realities. 
Here are some reference URLs found on this topic recently: ${searchResults.join(', ')}.

Return the response strictly adhering to the JSON schema. Ensure the HTML content is well-structured and uses semantic tags.`;

      const result = await generateObjectWithFallback({
        prompt,
        schema: GuideContentSchema,
        temperature: 0.7,
        maxTokens: 3000,
      });

      const guideData = result.object;

      console.log(`[3/3] Upserting into database: ${guideData.slug}`);
      await db.insert(guides).values({
        slug: guideData.slug,
        title: guideData.title,
        summary: guideData.summary,
        contentHtml: guideData.contentHtml,
        category: guideData.category as any,
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
          category: guideData.category as any,
          trendTopic: topic,
          keywords: guideData.keywords,
          readingTimeMinutes: guideData.readingTimeMinutes,
          updatedAt: new Date(),
        }
      });
      
      console.log(`Guide saved successfully.`);
      
      // Delay to avoid AI rate limits
      await new Promise(res => setTimeout(res, 5000));
      
    } catch (e) {
      console.error(`Failed to generate guide for "${topic}":`, e);
      console.log(`Waiting 30 seconds before retrying the same/next topic...`);
      await new Promise(res => setTimeout(res, 30000));
    }
  }
  
  console.log(`\nFinished script.`);
  process.exit(0);
}

main().catch(console.error);
