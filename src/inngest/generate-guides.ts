import { inngest } from "./client";
import { generateObjectWithFallback } from "@/lib/ai/router";
import { db } from "@/lib/db/client";
import { guides } from "@/lib/db/schema/guides";
import { z } from "zod";
import { searchGoogle } from "@/lib/scrapers/broad-search-engine";
import { eq } from "drizzle-orm";

const TROPICS = [
  "Tanzania health data trends DHIS2",
  "Kenya business compliance changes KRA eTIMS",
  "Uganda tax registration updates URSB",
  "East Africa tech salaries trends 2026",
  "PPRA Tanzania procurement guidelines update",
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

export const generateWeeklyGuidesJob = inngest.createFunction(
  { id: "generate-weekly-guides", name: "Generate Weekly Editorial Guides", triggers: [{ cron: "0 8 * * 1" }] }, // Every Monday at 8:00 AM UTC
  async ({ step }) => {
    // 1. Pick a random topic to cover this week
    const topic = TROPICS[Math.floor(Math.random() * TROPICS.length)];

    // 2. Search for recent news on this topic
    const searchResults = await step.run("search-news", async () => {
      const urls = await searchGoogle(topic, 5);
      return urls;
    });

    // 3. Generate the guide
    const guideData = await step.run("generate-guide-content", async () => {
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

      return result.object;
    });

    // 4. Upsert to DB
    await step.run("upsert-guide", async () => {
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
    });

    return { message: `Successfully generated and saved guide for topic: ${topic}` };
  }
);
