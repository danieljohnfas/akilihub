ALTER TABLE "compliance_requirements" ALTER COLUMN "renewal_period_days" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "tenders" ALTER COLUMN "deadline" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "health_data_unique_idx" ON "health_data_points" USING btree ("indicator_id","country_id","year");--> statement-breakpoint
CREATE UNIQUE INDEX "employers_name_country_idx" ON "employers" USING btree ("name","country_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_unique_idx" ON "bookmarks" USING btree ("user_id","item_type","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_alerts_unique_idx" ON "user_alerts" USING btree ("user_id","module","country_id");--> statement-breakpoint
ALTER TABLE "businesses" DROP COLUMN "search_vector";--> statement-breakpoint
ALTER TABLE "tenders" DROP COLUMN "extracted_text";--> statement-breakpoint
ALTER TABLE "tenders" DROP COLUMN "search_vector";