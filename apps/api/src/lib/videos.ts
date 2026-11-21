import {
  videoFailureCodeSchema,
  videoFailureSchema,
  videoStatusSchema,
  videoVisibilitySchema,
} from '@reel/shared';
import type { Video } from '@reel/shared';
import type { videos } from '../db/schema.js';
import { AppError } from './errors.js';
import { mediaUrl } from './storage-keys.js';
import { failureMessage } from './video-limits.js';

type VideoRow = typeof videos.$inferSelect;

interface VideoConfig {
  config: { MEDIA_PUBLIC_BASE_URL: string; MAX_VIDEO_SECONDS: number };
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function toVideo(app: VideoConfig, row: VideoRow, hashtags: string[] = []): Video {
  const code = videoFailureCodeSchema.safeParse(row.failureCode);
  const failure =
    row.status === 'failed' && code.success
      ? videoFailureSchema.parse({
          code: code.data,
          message: row.failureMessage ?? failureMessage(code.data, app.config.MAX_VIDEO_SECONDS),
        })
      : null;

  const playback =
    row.status === 'ready' && row.storageKey && row.thumbnailKey && row.durationSeconds
      ? {
          hlsUrl: mediaUrl(app, row.storageKey),
          thumbnailUrl: mediaUrl(app, row.thumbnailKey),
          durationSeconds: row.durationSeconds,
          width: row.width ?? 0,
          height: row.height ?? 0,
        }
      : null;

  return {
    id: row.id,
    ownerId: row.ownerId,
    caption: row.caption,
    status: videoStatusSchema.parse(row.status),
    visibility: videoVisibilitySchema.parse(row.visibility),
    hashtags,
    failure,
    playback:
      playback && playback.width > 0 && playback.height > 0
        ? {
            hlsUrl: playback.hlsUrl,
            thumbnailUrl: playback.thumbnailUrl,
            durationSeconds: playback.durationSeconds,
            width: playback.width,
            height: playback.height,
          }
        : null,
    createdAt: iso(row.createdAt),
  };
}

export interface VideoCursor {
  createdAt: Date;
  id: string;
}

export function encodeVideoCursor(row: { createdAt: Date; id: string }): string {
  return Buffer.from(`${iso(row.createdAt)}|${row.id}`, 'utf8').toString('base64url');
}

export function decodeVideoCursor(cursor: string): VideoCursor {
  try {
    const [createdAt, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
    if (!createdAt || !id) throw new Error('missing cursor fields');
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) throw new Error('invalid cursor date');
    return { createdAt: date, id };
  } catch {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid pagination cursor');
  }
}
