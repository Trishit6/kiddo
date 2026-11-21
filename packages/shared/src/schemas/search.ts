import { z } from 'zod';
import { paginationQuerySchema } from './pagination';
import { authorSummarySchema, feedItemSchema } from './social';

export const searchQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(2, 'Enter at least 2 characters').max(80),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const suggestQuerySchema = z.object({ q: z.string().trim().min(2).max(80) });
export type SuggestQuery = z.infer<typeof suggestQuerySchema>;

export const searchUserSchema = authorSummarySchema.extend({
  followersCount: z.number().int().nonnegative(),
  following: z.boolean(),
});
export type SearchUser = z.infer<typeof searchUserSchema>;

export const searchHashtagSchema = z.object({
  tag: z.string(),
  videosCount: z.number().int().nonnegative(),
});
export type SearchHashtag = z.infer<typeof searchHashtagSchema>;

export const suggestResponseSchema = z.object({
  users: z.array(searchUserSchema),
  hashtags: z.array(searchHashtagSchema),
});
export type SuggestResponse = z.infer<typeof suggestResponseSchema>;

export const searchUsersResponseSchema = z.object({
  items: z.array(searchUserSchema),
  nextCursor: z.string().nullable(),
});
export type SearchUsersResponse = z.infer<typeof searchUsersResponseSchema>;

export const searchVideosResponseSchema = z.object({
  items: z.array(feedItemSchema),
  nextCursor: z.string().nullable(),
});
export type SearchVideosResponse = z.infer<typeof searchVideosResponseSchema>;

export const searchHashtagsResponseSchema = z.object({
  items: z.array(searchHashtagSchema),
  nextCursor: z.string().nullable(),
});
export type SearchHashtagsResponse = z.infer<typeof searchHashtagsResponseSchema>;
