import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db, safeQuery } from "./src/lib/db/client.ts";
import { jobs } from "./src/lib/db/schema/jobs.ts";
import { eq, or, isNull, gt, count, and } from "drizzle-orm";

async function main() {
  console.log("DB URL:", process.env.DATABASE_URL?.substring(0, 30));
  
  const activeCondition = and(
    eq(jobs.isActive, true),
    or(isNull(jobs.deadline), gt(jobs.deadline, new Date()))
  );
  
  const c = await db.select({ value: count() }).from(jobs).where(activeCondition);
  console.log("Count with Date:", c);
  
  const activeCondition2 = eq(jobs.isActive, true);
  const c2 = await db.select({ value: count() }).from(jobs).where(activeCondition2);
  console.log("Count without Date:", c2);
  
  process.exit(0);
}
main().catch(console.error);
