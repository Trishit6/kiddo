ALTER TABLE "videos" ADD COLUMN "original_key" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "processing_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "original_delete_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "storage_cleaned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "failure_code" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "failure_message" text;