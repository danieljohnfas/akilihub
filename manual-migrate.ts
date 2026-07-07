import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL! + "?sslmode=require");

async function main() {
  console.log('Running raw SQL migration...');
  
  try {
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'compliance_resource_type') THEN
          CREATE TYPE "public"."compliance_resource_type" AS ENUM('form', 'calculator', 'guideline', 'notice');
        END IF;
      END$$;
    `;
    console.log('✅ Created enum type (or already exists)');
    
    try {
      await sql`ALTER TABLE "compliance_requirements" ADD COLUMN "resource_type" "compliance_resource_type" DEFAULT 'guideline' NOT NULL;`;
      console.log('✅ Added resource_type column');
    } catch (e: any) {
      if (!e.message.includes('already exists')) throw e;
      console.log('✅ resource_type column already exists');
    }

    try {
      await sql`CREATE UNIQUE INDEX "compliance_title_country_udx" ON "compliance_requirements" USING btree ("title","country_id");`;
      console.log('✅ Created unique index on compliance_requirements');
    } catch (e: any) {
      if (!e.message.includes('already exists')) throw e;
      console.log('✅ Unique index already exists');
    }

    try {
      await sql`ALTER TABLE "tenders" ADD CONSTRAINT "tenders_reference_no_unique" UNIQUE("reference_no");`;
      console.log('✅ Added unique constraint on tenders.reference_no');
    } catch (e: any) {
      if (!e.message.includes('already exists')) throw e;
      console.log('✅ Unique constraint already exists');
    }

    console.log('🎉 Migration successful!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sql.end();
  }
}

main();
