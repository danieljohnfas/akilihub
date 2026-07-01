CREATE TYPE "public"."compliance_category" AS ENUM('tax', 'business_registration', 'employment', 'environment', 'health_safety', 'sector_specific');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'contract', 'consultancy');--> statement-breakpoint
CREATE TYPE "public"."experience_level" AS ENUM('entry', 'mid', 'senior', 'executive');--> statement-breakpoint
CREATE TYPE "public"."tender_category" AS ENUM('goods', 'works', 'services', 'consultancy');--> statement-breakpoint
CREATE TYPE "public"."tender_status" AS ENUM('open', 'closed', 'awarded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."alert_frequency" AS ENUM('immediate', 'daily', 'weekly');--> statement-breakpoint
CREATE TABLE "business_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"country_id" uuid,
	CONSTRAINT "business_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "compliance_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"country_id" uuid NOT NULL,
	"business_type_id" uuid,
	"category" "compliance_category" NOT NULL,
	"issuing_authority" text NOT NULL,
	"renewal_period_days" text,
	"estimated_cost" text,
	"required_documents" text[],
	"source_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_data_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicator_id" uuid NOT NULL,
	"country_id" uuid NOT NULL,
	"value" numeric(12, 4) NOT NULL,
	"year" integer NOT NULL,
	"period" text,
	"source" text DEFAULT 'DHIS2',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_indicators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"unit" text,
	"category" text,
	"dhis2_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "health_indicators_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "employers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sector" text,
	"country_id" uuid,
	"is_verified" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" uuid,
	CONSTRAINT "job_categories_name_unique" UNIQUE("name"),
	CONSTRAINT "job_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "salary_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_title" text NOT NULL,
	"job_category_id" uuid,
	"employer_id" uuid,
	"country_id" uuid NOT NULL,
	"experience_level" "experience_level" NOT NULL,
	"employment_type" "employment_type" DEFAULT 'full_time' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"gross_monthly_salary" numeric(12, 2) NOT NULL,
	"net_monthly_salary" numeric(12, 2),
	"years_of_experience" integer,
	"is_anonymous" boolean DEFAULT true NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "countries_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tender_sectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "tender_sectors_name_unique" UNIQUE("name"),
	CONSTRAINT "tender_sectors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tenders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_no" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"contracting_authority" text NOT NULL,
	"country_id" uuid NOT NULL,
	"sector_id" uuid,
	"category" "tender_category" DEFAULT 'services',
	"status" "tender_status" DEFAULT 'open' NOT NULL,
	"budget" numeric(18, 2),
	"currency" text DEFAULT 'USD',
	"published_at" timestamp,
	"deadline" timestamp NOT NULL,
	"source_url" text NOT NULL,
	"document_url" text,
	"extracted_text" text,
	"search_vector" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"module" text NOT NULL,
	"keywords" text[],
	"country_id" uuid,
	"frequency" "alert_frequency" DEFAULT 'daily' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"country_id" uuid,
	"is_pro" boolean DEFAULT false NOT NULL,
	"pro_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "business_types" ADD CONSTRAINT "business_types_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_requirements" ADD CONSTRAINT "compliance_requirements_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_requirements" ADD CONSTRAINT "compliance_requirements_business_type_id_business_types_id_fk" FOREIGN KEY ("business_type_id") REFERENCES "public"."business_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_data_points" ADD CONSTRAINT "health_data_points_indicator_id_health_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."health_indicators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_data_points" ADD CONSTRAINT "health_data_points_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employers" ADD CONSTRAINT "employers_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_submissions" ADD CONSTRAINT "salary_submissions_job_category_id_job_categories_id_fk" FOREIGN KEY ("job_category_id") REFERENCES "public"."job_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_submissions" ADD CONSTRAINT "salary_submissions_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."employers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_submissions" ADD CONSTRAINT "salary_submissions_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regions" ADD CONSTRAINT "regions_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_sector_id_tender_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."tender_sectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_alerts" ADD CONSTRAINT "user_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_alerts" ADD CONSTRAINT "user_alerts_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "compliance_country_idx" ON "compliance_requirements" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "compliance_category_idx" ON "compliance_requirements" USING btree ("category");--> statement-breakpoint
CREATE INDEX "health_indicator_country_idx" ON "health_data_points" USING btree ("indicator_id","country_id");--> statement-breakpoint
CREATE INDEX "health_year_idx" ON "health_data_points" USING btree ("year");--> statement-breakpoint
CREATE INDEX "salary_country_idx" ON "salary_submissions" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "salary_category_idx" ON "salary_submissions" USING btree ("job_category_id");--> statement-breakpoint
CREATE INDEX "salary_level_idx" ON "salary_submissions" USING btree ("experience_level");--> statement-breakpoint
CREATE INDEX "tenders_country_idx" ON "tenders" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "tenders_status_idx" ON "tenders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tenders_deadline_idx" ON "tenders" USING btree ("deadline");