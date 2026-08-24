import { db } from "../src/lib/db/client";
import { jobs } from "../src/lib/db/schema/jobs";
import { tenders } from "../src/lib/db/schema/tenders";
import { gte, sql } from "drizzle-orm";

const run = async () => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const totalJobs = await db.select({ count: sql<number>`count(*)` }).from(jobs);
  const jobs24h = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(gte(jobs.createdAt, oneDayAgo));
  const jobs7d = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(gte(jobs.createdAt, sevenDaysAgo));

  const totalTenders = await db.select({ count: sql<number>`count(*)` }).from(tenders);
  const tenders7d = await db.select({ count: sql<number>`count(*)` }).from(tenders).where(gte(tenders.createdAt, sevenDaysAgo));
  const tenders30d = await db.select({ count: sql<number>`count(*)` }).from(tenders).where(gte(tenders.createdAt, thirtyDaysAgo));

  console.log(`--- JOBS ---`);
  console.log(`Total: ${totalJobs[0].count}`);
  console.log(`Last 24 hours: ${jobs24h[0].count}`);
  console.log(`Last 7 days: ${jobs7d[0].count}`);
  
  console.log(`\n--- TENDERS ---`);
  console.log(`Total: ${totalTenders[0].count}`);
  console.log(`Last 7 days: ${tenders7d[0].count}`);
  console.log(`Last 30 days: ${tenders30d[0].count}`);
};
run().catch(console.error).finally(()=>process.exit(0));
