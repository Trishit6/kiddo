import { z } from 'zod';
import { paginationQuerySchema } from './pagination';

export const notificationTypeSchema = z.enum([
  'like',
  'comment',
  'reply',
  'comment_like',
  'follow',
  'mention',
  'video_ready',
  'video_failed',
  'moderation',
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationFilterSchema = z.enum(['all', 'likes', 'comments', 'mentions', 'follows']);
export type NotificationFilter = z.infer<typeof notificationFilterSchema>;

export const notificationActorSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.url().nullable(),
});
export type NotificationActor = z.infer<typeof notificationActorSchema>;

const baseNotificationSchema = z.object({
  id: z.uuid(),
  type: notificationTypeSchema,
  actors: z.array(notificationActorSchema),
  actorCount: z.number().int().positive(),
  readAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  thumbnailUrl: z.url().nullable(),
  commentSnippet: z.string().nullable(),
  href: z.string(),
});

export const likeNotificationSchema = baseNotificationSchema.extend({
  type: z.literal('like'),
  videoId: z.uuid(),
});
export const commentNotificationSchema = baseNotificationSchema.extend({
  type: z.literal('comment'),
  videoId: z.uuid(),
  commentId: z.uuid(),
});
export const replyNotificationSchema = baseNotificationSchema.extend({
  type: z.literal('reply'),
  videoId: z.uuid(),
  commentId: z.uuid(),
});
export const commentLikeNotificationSchema = baseNotificationSchema.extend({
  type: z.literal('comment_like'),
  videoId: z.uuid(),
  commentId: z.uuid(),
});
export const followNotificationSchema = baseNotificationSchema.extend({
  type: z.literal('follow'),
});
export const mentionNotificationSchema = baseNotificationSchema.extend({
  type: z.literal('mention'),
  videoId: z.uuid().nullable(),
  commentId: z.uuid().nullable(),
});
export const videoReadyNotificationSchema = baseNotificationSchema.extend({
  type: z.literal('video_ready'),
  videoId: z.uuid(),
});
export const videoFailedNotificationSchema = baseNotificationSchema.extend({
  type: z.literal('video_failed'),
  videoId: z.uuid(),
});
export const moderationNotificationSchema = baseNotificationSchema.extend({
  type: z.literal('moderation'),
  videoId: z.uuid().nullable(),
});

export const notificationSchema = z.discriminatedUnion('type', [
  likeNotificationSchema,
  commentNotificationSchema,
  replyNotificationSchema,
  commentLikeNotificationSchema,
  followNotificationSchema,
  mentionNotificationSchema,
  videoReadyNotificationSchema,
  videoFailedNotificationSchema,
  moderationNotificationSchema,
]);
export type Notification = z.infer<typeof notificationSchema>;

export const notificationListQuerySchema = paginationQuerySchema.extend({
  type: notificationFilterSchema.default('all'),
});
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

export const notificationListResponseSchema = z.object({
  items: z.array(notificationSchema),
  nextCursor: z.string().nullable(),
});
export type NotificationListResponse = z.infer<typeof notificationListResponseSchema>;

export const unreadCountResponseSchema = z.object({ count: z.number().int().nonnegative() });
export type UnreadCountResponse = z.infer<typeof unreadCountResponseSchema>;

export const markReadRequestSchema = z
  .object({
    ids: z.array(z.uuid()).optional(),
    all: z.boolean().optional(),
  })
  .refine((value) => value.all === true || (value.ids?.length ?? 0) > 0, {
    message: 'Provide ids or all=true',
  });
export type MarkReadRequest = z.infer<typeof markReadRequestSchema>;

export const markReadResponseSchema = z.object({ marked: z.number().int().nonnegative() });
export type MarkReadResponse = z.infer<typeof markReadResponseSchema>;

export const notificationPreferenceSchema = z.object({
  likePush: z.boolean(),
  likeInApp: z.boolean(),
  commentPush: z.boolean(),
  commentInApp: z.boolean(),
  replyPush: z.boolean(),
  replyInApp: z.boolean(),
  commentLikePush: z.boolean(),
  commentLikeInApp: z.boolean(),
  followPush: z.boolean(),
  followInApp: z.boolean(),
  mentionPush: z.boolean(),
  mentionInApp: z.boolean(),
  videoReadyPush: z.boolean(),
  videoReadyInApp: z.boolean(),
  videoFailedPush: z.boolean(),
  videoFailedInApp: z.boolean(),
  moderationPush: z.boolean(),
  moderationInApp: z.boolean(),
});
export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;

export const notificationPreferenceResponseSchema = z.object({
  preferences: notificationPreferenceSchema,
});
export type NotificationPreferenceResponse = z.infer<typeof notificationPreferenceResponseSchema>;

export const notificationPreferenceUpdateSchema = notificationPreferenceSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one preference' });
export type NotificationPreferenceUpdate = z.infer<typeof notificationPreferenceUpdateSchema>;

export const notificationEventSchema = z.object({
  type: z.literal('unread-count'),
  count: z.number().int().nonnegative(),
});
export type NotificationEvent = z.infer<typeof notificationEventSchema>;
