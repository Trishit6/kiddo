import { z } from 'zod';
import { MAX_HASHTAGS_PER_VIDEO, SUPPORTED_VIDEO_MIME_TYPES } from '../constants';
import { paginatedSchema, paginationQuerySchema } from './pagination';

export const videoStatusSchema = z.enum(['uploading', 'processing', 'ready', 'failed']);
export type VideoStatus = z.infer<typeof videoStatusSchema>;

export const videoVisibilitySchema = z.enum(['public', 'unlisted', 'private']);
export type VideoVisibility = z.infer<typeof videoVisibilitySchema>;

export const videoFailureCodeSchema = z.enum([
  'video_too_long',
  'video_too_short',
  'video_too_large',
  'unsupported_format',
  'unsupported_codec',
  'dimensions_too_large',
  'corrupt_file',
  'no_video_stream',
  'processing_timeout',
  'processing_failed',
]);
export type VideoFailureCode = z.infer<typeof videoFailureCodeSchema>;

export const videoFailureSchema = z.object({
  code: videoFailureCodeSchema,
  message: z.string().min(1),
});
export type VideoFailure = z.infer<typeof videoFailureSchema>;

export const videoContentTypeSchema = z.enum(SUPPORTED_VIDEO_MIME_TYPES);
export type VideoContentType = z.infer<typeof videoContentTypeSchema>;

export const MAX_CAPTION_LENGTH = 2200;

export const videoPlaybackSchema = z.object({
  hlsUrl: z.url(),
  thumbnailUrl: z.url(),
  durationSeconds: z.number().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type VideoPlayback = z.infer<typeof videoPlaybackSchema>;

export const videoSchema = z.object({
  id: z.uuid(),
  ownerId: z.uuid(),
  caption: z.string(),
  status: videoStatusSchema,
  visibility: videoVisibilitySchema,
  hashtags: z.array(z.string()),
  failure: videoFailureSchema.nullable(),
  playback: videoPlaybackSchema.nullable(),
  createdAt: z.iso.datetime(),
});
export type Video = z.infer<typeof videoSchema>;

export const videoIdParamSchema = z.object({ id: z.uuid() });

export const createVideoUploadRequestSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: videoContentTypeSchema,
  sizeBytes: z.number().int().positive(),
  caption: z.string().max(MAX_CAPTION_LENGTH).optional(),
  visibility: videoVisibilitySchema.default('public'),
});
export type CreateVideoUploadRequest = z.infer<typeof createVideoUploadRequestSchema>;

export const videoUploadTargetSchema = z.object({
  url: z.url(),
  fields: z.record(z.string(), z.string()),
});
export type VideoUploadTarget = z.infer<typeof videoUploadTargetSchema>;

export const createVideoUploadResponseSchema = z.object({
  videoId: z.uuid(),
  upload: videoUploadTargetSchema,
  expiresIn: z.number().int().positive(),
});
export type CreateVideoUploadResponse = z.infer<typeof createVideoUploadResponseSchema>;

export const videoResponseSchema = z.object({ video: videoSchema });
export type VideoResponse = z.infer<typeof videoResponseSchema>;

export const videoStatusResponseSchema = z.object({
  id: z.uuid(),
  status: videoStatusSchema,
  progress: z.number().int().min(0).max(100),
  failure: videoFailureSchema.nullable(),
});
export type VideoStatusResponse = z.infer<typeof videoStatusResponseSchema>;

export const updateVideoRequestSchema = z
  .object({
    caption: z.string().max(MAX_CAPTION_LENGTH).optional(),
    visibility: videoVisibilitySchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one video field to update',
  });
export type UpdateVideoRequest = z.infer<typeof updateVideoRequestSchema>;

export const videoListQuerySchema = paginationQuerySchema;
export type VideoListQuery = z.infer<typeof videoListQuerySchema>;

export const videoListResponseSchema = paginatedSchema(videoSchema);
export type VideoListResponse = z.infer<typeof videoListResponseSchema>;

export interface VideoUploadProgress {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/**
 * Web (XMLHttpRequest) and mobile (expo-file-system) implement this so the
 * shared API flow can stay identical while the transport differs.
 */
export interface VideoUploadTransport<TFile> {
  upload(target: VideoUploadTarget, file: TFile, options?: VideoUploadProgress): Promise<void>;
}

export function parseHashtags(caption: string): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();
  const pattern = /(?:^|\s)#([A-Za-z0-9_]+)/g;
  for (const match of caption.matchAll(pattern)) {
    const raw = match[1];
    if (!raw) continue;
    const tag = raw.toLowerCase();
    if (seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= MAX_HASHTAGS_PER_VIDEO) break;
  }
  return tags;
}
