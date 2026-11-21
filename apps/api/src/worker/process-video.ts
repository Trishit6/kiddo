import { createWriteStream } from 'node:fs';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { and, eq, isNull } from 'drizzle-orm';
import { videoRenditions, videos } from '../db/schema.js';
import { removePrefix } from '../lib/s3-objects.js';
import { planRenditions } from '../lib/renditions.js';
import { originalKey } from '../lib/storage-keys.js';
import { VideoProcessingError, failureMessage, videoFailure } from '../lib/video-limits.js';
import type { WorkerContext } from './context.js';
import { probeVideo } from './probe.js';
import {
  generateThumbnail,
  transcodeRendition,
  uploadOutputs,
  writeMasterPlaylist,
} from './transcode.js';

const PROGRESS_KEY = (videoId: string) => `reel:video-progress:${videoId}`;
const PROGRESS_TTL_SECONDS = 6 * 60 * 60;

export async function setVideoProgress(
  ctx: WorkerContext,
  videoId: string,
  percent: number,
): Promise<void> {
  const value = Math.max(0, Math.min(99, Math.round(percent)));
  await ctx.redis.set(PROGRESS_KEY(videoId), String(value), 'EX', PROGRESS_TTL_SECONDS);
}

export async function markVideoFailed(
  ctx: WorkerContext,
  videoId: string,
  error: unknown,
): Promise<void> {
  const code = error instanceof VideoProcessingError ? error.code : 'processing_failed';
  const failure = videoFailure(code, ctx.config.MAX_VIDEO_SECONDS);
  await ctx.db
    .update(videos)
    .set({
      status: 'failed',
      failureCode: failure.code,
      failureMessage: failure.message,
      processingStartedAt: null,
    })
    .where(and(eq(videos.id, videoId), isNull(videos.deletedAt)));
  try {
    await removePrefix(ctx.s3, ctx.config.S3_BUCKET, `videos/${videoId}/`);
  } catch (cleanupError) {
    ctx.logger.warn({ err: cleanupError, videoId }, 'could not remove partial outputs');
  }
  await ctx.redis.del(PROGRESS_KEY(videoId));
}

export interface ProcessOptions {
  finalAttempt: boolean;
}

export async function runVideoProcessing(
  ctx: WorkerContext,
  videoId: string,
  options: ProcessOptions,
): Promise<void> {
  const [row] = await ctx.db.select().from(videos).where(eq(videos.id, videoId)).limit(1);
  if (!row || row.deletedAt) {
    ctx.logger.info({ videoId }, 'skipping deleted or missing video');
    return;
  }
  if (row.status === 'ready') {
    ctx.logger.info({ videoId }, 'video already ready; skipping duplicate job');
    return;
  }
  if (row.status !== 'processing') {
    ctx.logger.info({ videoId, status: row.status }, 'video is not processing; skipping job');
    return;
  }

  const tempDir = await mkdtemp(join(tmpdir(), `reel-${videoId}-`));
  const sourcePath = join(tempDir, 'source');
  const thumbnailPath = join(tempDir, 'thumb.jpg');
  const masterPath = join(tempDir, 'master.m3u8');

  try {
    // A retry may start after a partial attempt; clear outputs so the final
    // state can never contain stale renditions from an older run.
    await removePrefix(ctx.s3, ctx.config.S3_BUCKET, `videos/${videoId}/`);
    await setVideoProgress(ctx, videoId, 2);

    try {
      const source = await ctx.s3.getObject(ctx.config.S3_BUCKET, originalKey(videoId));
      await pipeline(source, createWriteStream(sourcePath));
    } catch (error) {
      throw new VideoProcessingError(
        'processing_failed',
        `Could not download original: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
    await setVideoProgress(ctx, videoId, 5);

    const probe = await probeVideo(sourcePath, ctx.config);
    await setVideoProgress(ctx, videoId, 10);

    const plans = planRenditions(probe.width, probe.height);
    const renditionDirs: Array<{ label: string; dir: string }> = [];
    for (const [index, plan] of plans.entries()) {
      const dir = join(tempDir, plan.label);
      await mkdir(dir, { recursive: true });
      const span = 75 / plans.length;
      await transcodeRendition(sourcePath, dir, plan, probe, ctx.config, (percent) => {
        const overall = 10 + index * span + (percent / 100) * span;
        void setVideoProgress(ctx, videoId, overall);
      });
      renditionDirs.push({ label: plan.label, dir });
    }
    await setVideoProgress(ctx, videoId, 85);

    await generateThumbnail(sourcePath, thumbnailPath, probe, ctx.config);
    await writeMasterPlaylist(masterPath, plans, probe.hasAudio);
    await setVideoProgress(ctx, videoId, 90);

    const output = await uploadOutputs(
      { s3: ctx.s3, bucket: ctx.config.S3_BUCKET },
      videoId,
      masterPath,
      thumbnailPath,
      renditionDirs,
      (percent) => {
        void setVideoProgress(ctx, videoId, 90 + percent * 0.09);
      },
    );

    const keepOriginalDays = ctx.config.KEEP_ORIGINAL_DAYS;
    const originalDeleteAt = new Date(Date.now() + keepOriginalDays * 24 * 60 * 60 * 1000);

    const updated = await ctx.db.transaction(async (tx) => {
      const [current] = await tx
        .update(videos)
        .set({
          status: 'ready',
          durationSeconds: Math.max(1, Math.round(probe.duration)),
          width: probe.width,
          height: probe.height,
          storageKey: output.storageKey,
          thumbnailKey: output.thumbnailKey,
          originalDeleteAt,
          failureCode: null,
          failureMessage: null,
          processingStartedAt: null,
        })
        .where(and(eq(videos.id, videoId), isNull(videos.deletedAt)))
        .returning({ id: videos.id });
      if (!current) return false;

      await tx.delete(videoRenditions).where(eq(videoRenditions.videoId, videoId));
      await tx.insert(videoRenditions).values(
        plans.map((plan) => ({
          videoId,
          label: plan.label,
          width: plan.width,
          height: plan.height,
          storageKey: `videos/${videoId}/hls/${plan.label}/index.m3u8`,
          codec: 'h264',
          bitrate: plan.videoBitrate,
        })),
      );
      return true;
    });

    if (!updated) {
      ctx.logger.info({ videoId }, 'video was deleted during processing; removing outputs');
      await removePrefix(ctx.s3, ctx.config.S3_BUCKET, `videos/${videoId}/`);
      return;
    }
    await ctx.redis.set(PROGRESS_KEY(videoId), '100', 'EX', PROGRESS_TTL_SECONDS);
    ctx.logger.info({ videoId, renditions: plans.map((plan) => plan.label) }, 'video ready');
  } catch (error) {
    ctx.logger.error(
      {
        err: error,
        videoId,
        failureMessage:
          error instanceof VideoProcessingError ? failureMessage(error.code) : undefined,
      },
      'video processing failed',
    );
    if (options.finalAttempt) await markVideoFailed(ctx, videoId, error);
    throw error;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
