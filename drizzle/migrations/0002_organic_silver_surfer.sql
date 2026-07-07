CREATE TYPE "public"."compliance_resource_type" AS ENUM('form', 'calculator', 'guideline', 'notice');--> statement-breakpoint
ALTER TABLE "compliance_requirements" ADD COLUMN "resource_type" "compliance_resource_type" DEFAULT 'guideline' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "compliance_title_country_udx" ON "compliance_requirements" USING btree ("title","country_id");--> statement-breakpoint
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_reference_no_unique" UNIQUE("reference_no");