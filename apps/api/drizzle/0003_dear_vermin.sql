CREATE TABLE "comment_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"comment_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "reply_to_user_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "followers_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "following_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "video_views" ADD COLUMN "anon_id" text;--> statement-breakpoint
ALTER TABLE "video_views" ADD COLUMN "watched_ms" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "video_views" ADD COLUMN "completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "saves_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "hot_score" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "comment_likes_user_comment_unique" ON "comment_likes" USING btree ("user_id","comment_id");--> statement-breakpoint
CREATE INDEX "comment_likes_comment_idx" ON "comment_likes" USING btree ("comment_id");--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_reply_to_user_id_users_id_fk" FOREIGN KEY ("reply_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_video_parent_created_idx" ON "comments" USING btree ("video_id","parent_id","created_at","id");--> statement-breakpoint
CREATE INDEX "comments_parent_created_idx" ON "comments" USING btree ("parent_id","created_at","id");--> statement-breakpoint
CREATE INDEX "comments_video_top_likes_idx" ON "comments" USING btree ("video_id","likes_count","created_at");--> statement-breakpoint
CREATE INDEX "follows_follower_created_idx" ON "follows" USING btree ("follower_id","created_at","id");--> statement-breakpoint
CREATE INDEX "follows_following_created_idx" ON "follows" USING btree ("following_id","created_at","id");--> statement-breakpoint
CREATE INDEX "likes_user_created_idx" ON "likes" USING btree ("user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "saves_user_created_idx" ON "saves" USING btree ("user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "video_hashtags_hashtag_video_idx" ON "video_hashtags" USING btree ("hashtag_id","video_id");--> statement-breakpoint
CREATE INDEX "video_views_user_created_idx" ON "video_views" USING btree ("viewer_id","created_at");--> statement-breakpoint
CREATE INDEX "video_views_anon_created_idx" ON "video_views" USING btree ("anon_id","created_at");--> statement-breakpoint
CREATE INDEX "videos_public_feed_idx" ON "videos" USING btree ("status","visibility","created_at");--> statement-breakpoint
CREATE INDEX "videos_hot_created_idx" ON "videos" USING btree ("hot_score","created_at");