import { z } from 'zod';
import { paginatedSchema, paginationQuerySchema } from './pagination';
import { reportReasonSchema, reportTargetTypeSchema } from './safety';
import { videoStatusSchema } from './videos';

export const adminStatsResponseSchema = z.object({
  users: z.number().int().nonnegative(),
  videos: z.number().int().nonnegative(),
  reportsPending: z.number().int().nonnegative(),
  failedVideos24h: z.number().int().nonnegative(),
  queue: z.object({
    videoProcessing: z.number().int().nonnegative(),
    notifications: z.number().int().nonnegative(),
  }),
  trends: z.object({
    signups: z.array(z.object({ day: z.string(), count: z.number().int().nonnegative() })),
    uploads: z.array(z.object({ day: z.string(), count: z.number().int().nonnegative() })),
    reports: z.array(z.object({ day: z.string(), count: z.number().int().nonnegative() })),
  }),
});
export type AdminStatsResponse = z.infer<typeof adminStatsResponseSchema>;

export const reportStatusSchema = z.enum(['pending', 'actioned', 'dismissed']);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

export const adminReportSchema = z.object({
  id: z.uuid(),
  reporterId: z.uuid(),
  targetType: reportTargetTypeSchema,
  targetId: z.uuid(),
  reason: reportReasonSchema,
  details: z.string().nullable(),
  status: reportStatusSchema,
  reporterCount: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  target: z.object({
    label: z.string(),
    preview: z.string().nullable(),
    ownerId: z.uuid().nullable(),
  }),
});
export type AdminReport = z.infer<typeof adminReportSchema>;

export const adminReportDetailSchema = adminReportSchema.extend({
  reports: z.array(
    z.object({
      id: z.uuid(),
      reason: reportReasonSchema,
      details: z.string().nullable(),
      createdAt: z.iso.datetime(),
    }),
  ),
});
export type AdminReportDetail = z.infer<typeof adminReportDetailSchema>;

export const adminReportListQuerySchema = paginationQuerySchema.extend({
  status: reportStatusSchema.optional(),
  reason: reportReasonSchema.optional(),
  targetType: reportTargetTypeSchema.optional(),
});
export type AdminReportListQuery = z.infer<typeof adminReportListQuerySchema>;

export const adminReportListResponseSchema = paginatedSchema(adminReportSchema);
export type AdminReportListResponse = z.infer<typeof adminReportListResponseSchema>;

export const resolveReportRequestSchema = z.object({
  action: z.enum(['dismiss', 'remove_content', 'ban_user']),
  reason: z.string().trim().min(1).max(500),
});
export type ResolveReportRequest = z.infer<typeof resolveReportRequestSchema>;

export const adminUserSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  displayName: z.string(),
  email: z.email(),
  role: z.enum(['user', 'admin']),
  status: z.enum(['active', 'banned']),
  bannedUntil: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type AdminUser = z.infer<typeof adminUserSchema>;

export const adminUserListQuerySchema = paginationQuerySchema.extend({ q: z.string().optional() });
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export const adminUserListResponseSchema = paginatedSchema(adminUserSchema);
export type AdminUserListResponse = z.infer<typeof adminUserListResponseSchema>;

export const adminVideoSchema = z.object({
  id: z.uuid(),
  ownerId: z.uuid(),
  caption: z.string(),
  status: videoStatusSchema,
  deletedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type AdminVideo = z.infer<typeof adminVideoSchema>;

export const adminVideoListQuerySchema = paginationQuerySchema.extend({
  q: z.string().optional(),
  status: videoStatusSchema.optional(),
});
export type AdminVideoListQuery = z.infer<typeof adminVideoListQuerySchema>;
export const adminVideoListResponseSchema = paginatedSchema(adminVideoSchema);
export type AdminVideoListResponse = z.infer<typeof adminVideoListResponseSchema>;

export const adminActionRequestSchema = z.object({ reason: z.string().trim().min(1).max(500) });
export type AdminActionRequest = z.infer<typeof adminActionRequestSchema>;

export const banUserRequestSchema = adminActionRequestSchema.extend({
  expiresAt: z.iso.datetime().optional(),
});
export type BanUserRequest = z.infer<typeof banUserRequestSchema>;

export const setRoleRequestSchema = z.object({ role: z.enum(['user', 'admin']) });
export type SetRoleRequest = z.infer<typeof setRoleRequestSchema>;

export const auditLogQuerySchema = paginationQuerySchema.extend({
  actor: z.string().optional(),
  action: z.string().optional(),
  target: z.string().optional(),
});
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

export const auditLogEntrySchema = z.object({
  id: z.uuid(),
  actorId: z.uuid(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  reason: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;
export const auditLogResponseSchema = paginatedSchema(auditLogEntrySchema);
export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>;

export const queueHealthSchema = z.object({
  queues: z.array(
    z.object({
      name: z.string(),
      waiting: z.number().int().nonnegative(),
      active: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
    }),
  ),
  failedJobs: z.array(
    z.object({
      id: z.string(),
      queue: z.string(),
      name: z.string(),
      error: z.string(),
      attempts: z.number().int().nonnegative(),
    }),
  ),
});
export type QueueHealthResponse = z.infer<typeof queueHealthSchema>;
