import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "data_verification_log" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "record_id" uuid NOT NULL,
        "source_module" text NOT NULL,
        "target_module" text NOT NULL,
        "action_taken" text NOT NULL,
        "verified_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    // Add columns to jobs
    await db.execute(sql`ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "sector" text;`);
    await db.execute(sql`ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "profession" text;`);
    await db.execute(sql`ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "experience_level" text;`);
    await db.execute(sql`ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "education_level" text;`);
    await db.execute(sql`ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "skills" text[];`);
    
    // Add other columns
    await db.execute(sql`ALTER TABLE "admin_config" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'admin' NOT NULL;`);
    await db.execute(sql`ALTER TABLE "tenders" ADD COLUMN IF NOT EXISTS "ai_summary" text;`);
    
    return NextResponse.json({ success: true, message: 'Migrations applied via Vercel' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
