CREATE TABLE "admin_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"password_hash" text NOT NULL,
	"totp_secret" text NOT NULL,
	"is_setup" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_number" text NOT NULL,
	"name" text NOT NULL,
	"type_id" uuid,
	"country_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"registration_date" timestamp,
	"directors" text[],
	"address" text,
	"search_vector" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_registration_number_unique" UNIQUE("registration_number")
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_type_id_business_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."business_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;