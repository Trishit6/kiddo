import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { MAX_ACTIVE_VIDEO_UPLOADS, VIDEO_UPLOADS_PER_HOUR } from '@reel/shared';
import type { FastifyInstance } from 'fastify';
import { videos } from '../db/schema.js';
import { AppError } from './errors.js';

export async function enforceUploadQuota(app: FastifyInstance, userId: string): Promise<void> {
  const [active] = await app.db
    .select({ count: sql<number>`count(*)::int` })
    .from(videos)
    .where(
      and(
        eq(videos.ownerId, userId),
        inArray(videos.status, ['uploading', 'processing']),
        isNull(videos.deletedAt),
      ),
    );
  if ((active?.count ?? 0) >= MAX_ACTIVE_VIDEO_UPLOADS) {
    throw new AppError(
      409,
      'VIDEO_ACTIVE_LIMIT',
      `Finish or remove one of your ${MAX_ACTIVE_VIDEO_UPLOADS} active uploads first`,
    );
  }

  const hour = new Date().toISOString().slice(0, 13);
  const key = `reel:video-uploads:${userId}:${hour}`;
  const count = await app.redis.incr(key);
  if (count === 1) await app.redis.expire(key, 60 * 60);
  if (count > VIDEO_UPLOADS_PER_HOUR) {
    throw new AppError(
      429,
      'VIDEO_UPLOAD_LIMIT',
      `You can start at most ${VIDEO_UPLOADS_PER_HOUR} uploads per hour`,
    );
  }
}
