DROP INDEX "comments_video_top_likes_idx";--> statement-breakpoint
CREATE INDEX "comments_video_top_likes_idx" ON "comments" USING btree ("video_id","parent_id","likes_count","created_at","id");