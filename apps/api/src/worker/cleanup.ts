import { and, eq, isNotNull, isNull, lt, or } from 'drizzle-orm';
import { videos } from '../db/schema.js';
import { removePrefixes } from '../lib/s3-objects.js';
import { videoStoragePrefixes } from '../lib/storage-keys.js';
import type { WorkerContext } from './context.js';

export interface SweepResult {
  staleUploads: number;
  stuckProcessing: number;
  expiredOriginals: number;
  cleanedDeleted: number;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export async function deleteVideoStorage(ctx: WorkerContext, videoId: string): Promise<void> {
  await removePrefixes(ctx.s3, ctx.config.S3_BUCKET, videoStoragePrefixes(videoId));
  await ctx.db.update(videos).set({ storageCleanedAt: new Date() }).where(eq(videos.id, videoId));
}

export async function sweep(ctx: WorkerContext): Promise<SweepResult> {
  const now = Date.now();
  const result: SweepResult = {
    staleUploads: 0,
    stuckProcessing: 0,
    expiredOriginals: 0,
    cleanedDeleted: 0,
  };

  const staleUploads = await ctx.db
    .select({ id: videos.id })
    .from(videos)
    .where(
      and(
        eq(videos.status, 'uploading'),
        lt(videos.createdAt, new Date(now - DAY)),
        isNull(videos.deletedAt),
      ),
    );
  for (const video of staleUploads) {
    try {
      await removePrefixes(ctx.s3, ctx.config.S3_BUCKET, videoStoragePrefixes(video.id));
      await ctx.db.delete(videos).where(eq(videos.id, video.id));
      result.staleUploads += 1;
    } catch (error) {
      ctx.logger.warn({ err: error, videoId: video.id }, 'could not delete stale upload');
    }
  }

  const stuckProcessing = await ctx.db
    .select({ id: videos.id })
    .from(videos)
    .where(
      and(
        eq(videos.status, 'processing'),
        isNull(videos.deletedAt),
        or(
          lt(videos.processingStartedAt, new Date(now - HOUR)),
          and(isNull(videos.processingStartedAt), lt(videos.createdAt, new Date(now - HOUR))),
        ),
      ),
    );
  for (const video of stuckProcessing) {
    await ctx.db
      .update(videos)
      .set({
        status: 'failed',
        failureCode: 'processing_timeout',
        failureMessage: 'Processing took too long, please try again',
        processingStartedAt: null,
      })
      .where(eq(videos.id, video.id));
    result.stuckProcessing += 1;
  }

  const expiredOriginals = await ctx.db
    .select({ id: videos.id, originalKey: videos.originalKey })
    .from(videos)
    .where(and(isNotNull(videos.originalKey), lt(videos.originalDeleteAt, new Date(now))));
  for (const video of expiredOriginals) {
    if (!video.originalKey) continue;
    try {
      await ctx.s3.removeObject(ctx.config.S3_BUCKET, video.originalKey);
      await ctx.db.update(videos).set({ originalKey: null }).where(eq(videos.id, video.id));
      result.expiredOriginals += 1;
    } catch (error) {
      ctx.logger.warn({ err: error, videoId: video.id }, 'could not delete expired original');
    }
  }

  const deletedVideos = await ctx.db
    .select({ id: videos.id })
    .from(videos)
    .where(and(isNotNull(videos.deletedAt), isNull(videos.storageCleanedAt)));
  for (const video of deletedVideos) {
    try {
      await deleteVideoStorage(ctx, video.id);
      result.cleanedDeleted += 1;
    } catch (error) {
      ctx.logger.warn({ err: error, videoId: video.id }, 'could not clean deleted video');
    }
  }

  return result;
}
