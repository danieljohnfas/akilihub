CREATE TYPE "public"."guide_category" AS ENUM('procurement', 'health', 'compliance', 'jobs', 'salaries', 'general');--> statement-breakpoint
CREATE TABLE "guides" (
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
