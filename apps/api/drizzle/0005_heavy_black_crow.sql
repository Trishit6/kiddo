CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."comment_permission" AS ENUM('everyone', 'followers', 'nobody');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'actioned', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."report_target_type" AS ENUM('video', 'comment', 'user');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'reply' BEFORE 'follow';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'comment_like' BEFORE 'follow';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'video_ready';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'video_failed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'moderation';--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "not_interested" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"video_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"less_from_author" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"like_push" boolean DEFAULT true NOT NULL,
	"like_in_app" boolean DEFAULT true NOT NULL,
	"comment_push" boolean DEFAULT true NOT NULL,
	"comment_in_app" boolean DEFAULT true NOT NULL,
	"reply_push" boolean DEFAULT true NOT NULL,
	"reply_in_app" boolean DEFAULT true NOT NULL,
	"comment_like_push" boolean DEFAULT true NOT NULL,
	"comment_like_in_app" boolean DEFAULT true NOT NULL,
	"follow_push" boolean DEFAULT true NOT NULL,
	"follow_in_app" boolean DEFAULT true NOT NULL,
	"mention_push" boolean DEFAULT true NOT NULL,
	"mention_in_app" boolean DEFAULT true NOT NULL,
	"video_ready_push" boolean DEFAULT true NOT NULL,
	"video_ready_in_app" boolean DEFAULT true NOT NULL,
	"video_failed_push" boolean DEFAULT true NOT NULL,
	"video_failed_in_app" boolean DEFAULT true NOT NULL,
	"moderation_push" boolean DEFAULT true NOT NULL,
	"moderation_in_app" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"device_id" text NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "reason" SET DATA TYPE text;--> statement-breakpoint
UPDATE "reports" SET "reason" = 'hate_harassment' WHERE "reason" = 'harassment';--> statement-breakpoint
UPDATE "reports" SET "reason" = 'intellectual_property' WHERE "reason" = 'copyright';--> statement-breakpoint
DROP TYPE "public"."report_reason";--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('spam', 'nudity_sexual', 'violence', 'hate_harassment', 'self_harm', 'minor_safety', 'illegal', 'intellectual_property', 'other');--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "reason" SET DATA TYPE "public"."report_reason" USING "reason"::"public"."report_reason";--> statement-breakpoint
DROP INDEX "reports_video_idx";--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "video_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "actor_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "actor_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "group_key" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "payload" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "target_type" "report_target_type" DEFAULT 'video' NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "target_id" uuid;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "status" "report_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "resolution" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
UPDATE "reports" SET "target_id" = "video_id" WHERE "target_id" IS NULL;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "target_id" SET NOT NULL;--> statement-breakpoint
INSERT INTO "notification_preferences" ("user_id") SELECT "id" FROM "users" ON CONFLICT ("user_id") DO NOTHING;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "comment_permission" "comment_permission" DEFAULT 'everyone' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "scheduled_purge_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "caption_search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', caption)) STORED NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "not_interested" ADD CONSTRAINT "not_interested_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "not_interested" ADD CONSTRAINT "not_interested_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "not_interested" ADD CONSTRAINT "not_interested_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_actor_created_idx" ON "admin_audit_log" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_target_idx" ON "admin_audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "admin_audit_created_idx" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "blocks_pair_unique" ON "blocks" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE INDEX "blocks_blocked_idx" ON "blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE UNIQUE INDEX "not_interested_user_video_unique" ON "not_interested" USING btree ("user_id","video_id");--> statement-breakpoint
CREATE INDEX "not_interested_author_idx" ON "not_interested" USING btree ("user_id","author_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_tokens_token_unique" ON "push_tokens" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "push_tokens_user_device_unique" ON "push_tokens" USING btree ("user_id","device_id");--> statement-breakpoint
CREATE INDEX "push_tokens_user_idx" ON "push_tokens" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hashtags_name_prefix_idx" ON "hashtags" USING btree ("name" text_pattern_ops);--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_unread_group_unique" ON "notifications" USING btree ("user_id","group_key") WHERE "notifications"."read_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "reports_reporter_target_unique" ON "reports" USING btree ("reporter_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "reports_target_idx" ON "reports" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "reports_status_created_idx" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "users_username_trgm_idx" ON "users" USING gin (lower("username") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "users_display_name_trgm_idx" ON "users" USING gin (lower("display_name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "videos_caption_search_idx" ON "videos" USING gin ("caption_search");