import { z } from 'zod';

export const cursorSchema = z.string().min(1);
export type Cursor = z.infer<typeof cursorSchema>;

export const socialListQuerySchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});
export type SocialListQuery = z.infer<typeof socialListQuerySchema>;

export const authorSummarySchema = z.object({
  id: z.uuid(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.url().nullable(),
});
export type AuthorSummary = z.infer<typeof authorSummarySchema>;

export const feedVideoSchema = z.object({
  id: z.uuid(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  durationSeconds: z.number().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  hlsUrl: z.url(),
  thumbnailUrl: z.url(),
});
export type FeedVideo = z.infer<typeof feedVideoSchema>;

export const feedCountsSchema = z.object({
  likes: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  saves: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative(),
  views: z.number().int().nonnegative(),
});
export type FeedCounts = z.infer<typeof feedCountsSchema>;

export const feedViewerStateSchema = z.object({
  liked: z.boolean(),
  saved: z.boolean(),
  followingAuthor: z.boolean(),
});
export type FeedViewerState = z.infer<typeof feedViewerStateSchema>;

export const feedItemSchema = z.object({
  video: feedVideoSchema,
  author: authorSummarySchema,
  counts: feedCountsSchema,
  viewerState: feedViewerStateSchema,
});
export type FeedItem = z.infer<typeof feedItemSchema>;

export const feedResponseSchema = z.object({
  items: z.array(feedItemSchema),
  nextCursor: z.string().nullable(),
});
export type FeedResponse = z.infer<typeof feedResponseSchema>;

export const feedItemResponseSchema = z.object({ item: feedItemSchema });
export type FeedItemResponse = z.infer<typeof feedItemResponseSchema>;

export const feedKindSchema = z.enum(['following', 'for-you']);
export type FeedKind = z.infer<typeof feedKindSchema>;

export const videoLikeResponseSchema = z.object({
  videoId: z.uuid(),
  liked: z.boolean(),
  likesCount: z.number().int().nonnegative(),
});
export type VideoLikeResponse = z.infer<typeof videoLikeResponseSchema>;

export const videoSaveResponseSchema = z.object({
  videoId: z.uuid(),
  saved: z.boolean(),
  savesCount: z.number().int().nonnegative(),
});
export type VideoSaveResponse = z.infer<typeof videoSaveResponseSchema>;

export const followResponseSchema = z.object({
  username: z.string(),
  following: z.boolean(),
  followersCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
});
export type FollowResponse = z.infer<typeof followResponseSchema>;

export const followListItemSchema = z.object({
  user: authorSummarySchema,
  viewerState: z.object({ following: z.boolean() }),
});
export type FollowListItem = z.infer<typeof followListItemSchema>;

export const followListResponseSchema = z.object({
  items: z.array(followListItemSchema),
  nextCursor: z.string().nullable(),
});
export type FollowListResponse = z.infer<typeof followListResponseSchema>;

export const recordViewRequestSchema = z.object({
  watchedMs: z.number().int().nonnegative(),
  completed: z.boolean(),
});
export type RecordViewRequest = z.infer<typeof recordViewRequestSchema>;

export const recordViewResponseSchema = z.object({
  counted: z.boolean(),
  viewsCount: z.number().int().nonnegative(),
});
export type RecordViewResponse = z.infer<typeof recordViewResponseSchema>;

export const shareVideoResponseSchema = z.object({
  videoId: z.uuid(),
  sharesCount: z.number().int().nonnegative(),
});
export type ShareVideoResponse = z.infer<typeof shareVideoResponseSchema>;

export const commentSortSchema = z.enum(['newest', 'top']);
export type CommentSort = z.infer<typeof commentSortSchema>;

export const commentListQuerySchema = socialListQuerySchema.extend({
  sort: commentSortSchema.default('newest'),
});
export type CommentListQuery = z.infer<typeof commentListQuerySchema>;

export const commentSchema = z.object({
  id: z.uuid(),
  videoId: z.uuid(),
  parentId: z.uuid().nullable(),
  text: z.string(),
  isRemoved: z.boolean(),
  author: authorSummarySchema.nullable(),
  replyToUser: authorSummarySchema.nullable(),
  likesCount: z.number().int().nonnegative(),
  replyCount: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  viewerState: z.object({ liked: z.boolean() }),
});
export type Comment = z.infer<typeof commentSchema>;

export const commentListResponseSchema = z.object({
  items: z.array(commentSchema),
  nextCursor: z.string().nullable(),
});
export type CommentListResponse = z.infer<typeof commentListResponseSchema>;

export const createCommentRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(500, 'Comment must be at most 500 characters'),
  parentId: z.uuid().optional(),
});
export type CreateCommentRequest = z.infer<typeof createCommentRequestSchema>;

export const commentResponseSchema = z.object({ comment: commentSchema });
export type CommentResponse = z.infer<typeof commentResponseSchema>;

export const commentLikeResponseSchema = z.object({
  commentId: z.uuid(),
  liked: z.boolean(),
  likesCount: z.number().int().nonnegative(),
});
export type CommentLikeResponse = z.infer<typeof commentLikeResponseSchema>;

export const trendingHashtagSchema = z.object({
  tag: z.string(),
  videosCount: z.number().int().nonnegative(),
});
export type TrendingHashtag = z.infer<typeof trendingHashtagSchema>;

export const trendingResponseSchema = z.object({
  hashtags: z.array(trendingHashtagSchema),
  videos: z.array(feedItemSchema),
});
export type TrendingResponse = z.infer<typeof trendingResponseSchema>;

export const hashtagParamSchema = z.object({
  tag: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9_]+$/, 'Invalid hashtag'),
});
export type HashtagParam = z.infer<typeof hashtagParamSchema>;

export const AUTH_REQUIRED_CODE = 'AUTH_REQUIRED' as const;
