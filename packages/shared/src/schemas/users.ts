import { z } from 'zod';

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(24, 'Username must be at most 24 characters')
  .regex(/^[A-Za-z0-9._]+$/, 'Use only letters, numbers, periods and underscores');

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Display name is required')
  .max(80, 'Display name must be at most 80 characters');

export const bioSchema = z.string().max(500, 'Bio must be at most 500 characters');
export const roleSchema = z.enum(['user', 'admin']);
export type UserRole = z.infer<typeof roleSchema>;
export const userStatusSchema = z.enum(['active', 'banned']);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const avatarContentTypeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp']);

export const publicCountsSchema = z.object({
  videos: z.number().int().nonnegative(),
  followers: z.number().int().nonnegative(),
  following: z.number().int().nonnegative(),
});

export const publicUserSchema = z.object({
  id: z.uuid(),
  username: usernameSchema,
  displayName: displayNameSchema,
  bio: bioSchema,
  avatarUrl: z.url().nullable(),
  role: roleSchema,
  createdAt: z.iso.datetime(),
  counts: publicCountsSchema,
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const meUserSchema = publicUserSchema.extend({
  email: z.email(),
  emailVerified: z.boolean(),
});
export type MeUser = z.infer<typeof meUserSchema>;

export const usernameParamSchema = z.object({ username: usernameSchema });
export const publicProfileResponseSchema = z.object({
  user: publicUserSchema,
  viewerState: z.object({ following: z.boolean() }),
});
export type PublicProfileResponse = z.infer<typeof publicProfileResponseSchema>;

export const updateProfileRequestSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    bio: bioSchema.optional(),
    username: usernameSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one profile field to update',
  });
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;

export const avatarUploadRequestSchema = z.object({
  contentType: avatarContentTypeSchema,
  size: z.number().int().positive().max(MAX_AVATAR_BYTES),
});
export type AvatarUploadRequest = z.infer<typeof avatarUploadRequestSchema>;

export const avatarUploadUrlResponseSchema = z.object({
  uploadUrl: z.url(),
  key: z.string().min(1),
  publicUrl: z.url(),
  expiresIn: z.number().int().positive(),
});
export type AvatarUploadUrlResponse = z.infer<typeof avatarUploadUrlResponseSchema>;

export const avatarConfirmRequestSchema = z.object({
  key: z.string().min(1),
  contentType: avatarContentTypeSchema,
  size: z.number().int().positive().max(MAX_AVATAR_BYTES),
});
export type AvatarConfirmRequest = z.infer<typeof avatarConfirmRequestSchema>;

export const avatarConfirmResponseSchema = z.object({ user: meUserSchema });
export type AvatarConfirmResponse = z.infer<typeof avatarConfirmResponseSchema>;

export const meResponseSchema = z.object({ user: meUserSchema });
export type MeResponse = z.infer<typeof meResponseSchema>;
