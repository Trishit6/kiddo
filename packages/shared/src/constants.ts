export const DEFAULT_MAX_VIDEO_MB = 200;
export const MAX_VIDEO_DURATION_SECONDS = 60;
export const MIN_VIDEO_DURATION_SECONDS = 1;
export const MAX_VIDEO_DIMENSION = 4096;
export const MAX_HASHTAGS_PER_VIDEO = 30;
export const VIDEO_UPLOAD_EXPIRY_SECONDS = 15 * 60;
export const VIDEO_UPLOADS_PER_HOUR = 20;
export const MAX_ACTIVE_VIDEO_UPLOADS = 3;
export const DEFAULT_PAGINATION_LIMIT = 20;
export const MAX_PAGINATION_LIMIT = 100;
export const SUPPORTED_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;
export const SUPPORTED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const COMMON_PASSWORDS = [
  'password',
  'password1',
  'password123',
  'password1234',
  '12345678',
  '123456789',
  'qwerty123',
  'letmein123',
  'iloveyou123',
  'admin12345',
  'welcome123',
] as const;
