import { z } from 'zod';
import { bioSchema, displayNameSchema, meUserSchema, usernameSchema } from './users';

export const emailSchema = z.email().transform((value) => value.trim().toLowerCase());
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

export const signupRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  displayName: displayNameSchema.optional(),
  bio: bioSchema.optional(),
});
export type SignupRequest = z.infer<typeof signupRequestSchema>;

export const loginRequestSchema = z.object({ email: emailSchema, password: passwordSchema });
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const refreshRequestSchema = z.object({ refreshToken: z.string().min(1).optional() });
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const logoutRequestSchema = refreshRequestSchema;
export type LogoutRequest = z.infer<typeof logoutRequestSchema>;

export const googleSignInRequestSchema = z.object({ idToken: z.string().min(1) });
export type GoogleSignInRequest = z.infer<typeof googleSignInRequestSchema>;

export const verifyEmailRequestSchema = z.object({ token: z.string().min(1) });
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;

export const resendVerificationRequestSchema = z.object({ email: emailSchema });
export type ResendVerificationRequest = z.infer<typeof resendVerificationRequestSchema>;

export const forgotPasswordRequestSchema = z.object({ email: emailSchema });
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().nullable(),
  expiresIn: z.number().int().positive(),
  tokenType: z.literal('Bearer'),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

export const authResponseSchema = z.object({ user: meUserSchema, tokens: authTokensSchema });
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const messageResponseSchema = z.object({ message: z.string().min(1) });
export type MessageResponse = z.infer<typeof messageResponseSchema>;
