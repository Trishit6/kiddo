import { z } from 'zod';
import { authorSummarySchema } from './social';

export const reportTargetTypeSchema = z.enum(['video', 'comment', 'user']);
export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;

export const reportReasonSchema = z.enum([
  'spam',
  'nudity_sexual',
  'violence',
  'hate_harassment',
  'self_harm',
  'minor_safety',
  'illegal',
  'intellectual_property',
  'other',
]);
export type ReportReason = z.infer<typeof reportReasonSchema>;

export const createReportRequestSchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: z.uuid(),
  reason: reportReasonSchema,
  details: z.string().trim().max(500).optional(),
});
export type CreateReportRequest = z.infer<typeof createReportRequestSchema>;

export const reportResponseSchema = z.object({
  id: z.uuid(),
  reported: z.boolean(),
  message: z.string(),
});
export type ReportResponse = z.infer<typeof reportResponseSchema>;

export const notInterestedRequestSchema = z.object({
  lessFromAuthor: z.boolean().default(false),
});
export type NotInterestedRequest = z.infer<typeof notInterestedRequestSchema>;

export const messageAckSchema = z.object({ ok: z.boolean() });
export type MessageAck = z.infer<typeof messageAckSchema>;

export const blockedUserSchema = z.object({
  user: authorSummarySchema,
  blockedAt: z.iso.datetime(),
});
export type BlockedUser = z.infer<typeof blockedUserSchema>;

export const blockedUsersResponseSchema = z.object({ items: z.array(blockedUserSchema) });
export type BlockedUsersResponse = z.infer<typeof blockedUsersResponseSchema>;

export const commentPermissionSchema = z.enum(['everyone', 'followers', 'nobody']);
export type CommentPermission = z.infer<typeof commentPermissionSchema>;

export const commentPermissionUpdateSchema = z.object({
  commentPermission: commentPermissionSchema,
});
export type CommentPermissionUpdate = z.infer<typeof commentPermissionUpdateSchema>;

export const deleteAccountRequestSchema = z.object({
  password: z.string().min(1).optional(),
  googleIdToken: z.string().min(1).optional(),
});
export type DeleteAccountRequest = z.infer<typeof deleteAccountRequestSchema>;

export const accountDeletionResponseSchema = z.object({
  scheduledPurgeAt: z.iso.datetime(),
  message: z.string(),
});
export type AccountDeletionResponse = z.infer<typeof accountDeletionResponseSchema>;

export const pushTokenRegisterSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['android', 'ios', 'web']),
  deviceId: z.string().min(1).max(128),
});
export type PushTokenRegister = z.infer<typeof pushTokenRegisterSchema>;
