CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."attachment_type" AS ENUM('pdf', 'doc', 'xlsx', 'zip', 'other');--> statement-breakpoint
CREATE TABLE "tender_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tender_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" "attachment_type" DEFAULT 'pdf' NOT NULL,
	"file_size_bytes" integer,
	"extracted_text" text,
	"extraction_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tender_attachments_file_url_unique" UNIQUE("file_url")
);
--> statement-breakpoint
CREATE TABLE "user_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"filename" text NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tender_attachments" ADD CONSTRAINT "tender_attachments_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_tender_idx" ON "tender_attachments" USING btree ("tender_id");--> statement-breakpoint
CREATE INDEX "attachments_status_idx" ON "tender_attachments" USING btree ("extraction_status");