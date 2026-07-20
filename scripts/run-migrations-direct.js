import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL + '?sslmode=require');

async function run() {
  try {
    console.log('Checking jobs table...');
    await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_min numeric(14,2)`;
    await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_max numeric(14,2)`;
    await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_currency text`;
    console.log('✅ Jobs table verified.');

    console.log('Checking guides table...');
    try {
      await sql`CREATE TYPE "public"."guide_category" AS ENUM('procurement', 'health', 'compliance', 'jobs', 'salaries', 'general');`;
    } catch(e) { if (!e.message.includes('already exists')) throw e; }
    
    await sql`
      CREATE TABLE IF NOT EXISTS "guides" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "slug" text NOT NULL,
        "title" text NOT NULL,
        "summary" text NOT NULL,
        "content_html" text NOT NULL,
        "category" "guide_category" DEFAULT 'general' NOT NULL,
        "trend_topic" text,
        "keywords" text,
        "reading_time_minutes" integer DEFAULT 5,
        "is_published" boolean DEFAULT true NOT NULL,
        "published_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "view_count" integer DEFAULT 0 NOT NULL,
        CONSTRAINT "guides_slug_unique" UNIQUE("slug")
      );
    `;
    console.log('✅ Guides table verified.');

    console.log('Checking user_documents table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "user_documents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "session_id" text NOT NULL,
        "filename" text NOT NULL,
        "content" text NOT NULL,
        "summary" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    console.log('✅ user_documents table verified.');
    
    console.log('🎉 All migrations complete!');
  } catch(e) { 
    console.error('❌ Error during migration:', e); 
  } finally { 
    await sql.end(); 
    process.exit(0);
  }
}
run();
