import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL! + "?sslmode=require");

async function main() {
  console.log('Running jobs schema migration...');
  
  try {
    // Create Enum
    try {
      await sql`CREATE TYPE "public"."job_type" AS ENUM('full_time', 'part_time', 'contract', 'internship', 'remote');`;
      console.log('✅ Created job_type enum');
    } catch (e: any) {
      if (!e.message.includes('already exists')) throw e;
      console.log('✅ job_type enum already exists');
    }

    // Create Table
    try {
      await sql`
        CREATE TABLE "jobs" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "title" text NOT NULL,
          "company_name" text NOT NULL,
          "description" text NOT NULL,
          "requirements" text,
          "location" text,
          "country_id" uuid NOT NULL,
          "job_type" "job_type" DEFAULT 'full_time',
          "source_url" text NOT NULL,
          "posted_date" timestamp,
          "deadline" timestamp,
          "is_active" boolean DEFAULT true NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL,
          CONSTRAINT "jobs_source_url_unique" UNIQUE("source_url")
        );
      `;
      console.log('✅ Created jobs table');
      
      // Foreign key
      await sql`ALTER TABLE "jobs" ADD CONSTRAINT "jobs_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;`;
      console.log('✅ Added foreign key for country_id');
      
      // Indexes
      await sql`CREATE INDEX "jobs_country_idx" ON "jobs" USING btree ("country_id");`;
      await sql`CREATE INDEX "jobs_deadline_idx" ON "jobs" USING btree ("deadline");`;
      await sql`CREATE INDEX "jobs_active_idx" ON "jobs" USING btree ("is_active");`;
      console.log('✅ Created indexes');
      
    } catch (e: any) {
      if (!e.message.includes('already exists')) throw e;
      console.log('✅ jobs table already exists');
    }

    console.log('🎉 Jobs Migration successful!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sql.end();
  }
}

main();
