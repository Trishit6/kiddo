import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import pino from 'pino';
import { createDb } from './db/client.js';
import { env } from './env.js';
import {
  MAINTENANCE_QUEUE,
  NOTIFICATIONS_QUEUE,
  PUSH_QUEUE,
  SOCIAL_QUEUE,
  VIDEO_CLEANUP_QUEUE,
  VIDEO_PROCESSING_QUEUE,
} from './lib/queue-names.js';
import {
  enqueueNotification,
  type NotificationJobData,
  type PushJobData,
} from './lib/notification-jobs.js';
import type { VideoJobData } from './lib/video-jobs.js';
import { videos } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { createS3Client } from './plugins/s3.js';
import { deleteVideoStorage, sweep } from './worker/cleanup.js';
import type { WorkerContext } from './worker/context.js';
import { runCommand } from './worker/command.js';
import { liftExpiredBans, purgeDeletedAccounts } from './worker/maintenance-jobs.js';
import { runNotificationJob } from './worker/notification-jobs.js';
import { runPushJob } from './worker/push-jobs.js';
import { markVideoFailed, runVideoProcessing } from './worker/process-video.js';
import { recomputeHotScores, reconcileCounters } from './worker/social-jobs.js';

const logger = pino({ level: env.LOG_LEVEL });

async function checkBinary(binary: string, flag: string): Promise<void> {
  try {
    await runCommand(binary, [flag], { timeoutMs: 10_000 });
  } catch {
    logger.error(
      `${binary} is not available. Install ffmpeg and make sure it is on PATH, or set FFMPEG_PATH/FFPROBE_PATH.`,
    );
    process.exit(1);
  }
}

const { pool, db } = createDb(env.DATABASE_URL);
const s3 = createS3Client(env);
const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
redis.on('error', (error: Error) => logger.error({ err: error }, 'redis connection error'));

const context: WorkerContext = { config: env, db, s3, redis, logger };

const queueConnection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const cleanupQueue = new Queue(VIDEO_CLEANUP_QUEUE, { connection: queueConnection });
const socialQueue = new Queue(SOCIAL_QUEUE, { connection: queueConnection });
const notificationQueue = new Queue(NOTIFICATIONS_QUEUE, { connection: queueConnection });
const pushQueue = new Queue(PUSH_QUEUE, { connection: queueConnection });
const maintenanceQueue = new Queue(MAINTENANCE_QUEUE, { connection: queueConnection });

const processingWorker = new Worker<VideoJobData>(
  VIDEO_PROCESSING_QUEUE,
  async (job) => {
    const attempts = job.opts.attempts ?? 1;
    const finalAttempt = job.attemptsMade + 1 >= attempts;
    await runVideoProcessing(context, job.data.videoId, { finalAttempt });
  },
  {
    connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }),
    concurrency: env.WORKER_CONCURRENCY,
    lockDuration: 10 * 60 * 1000,
    stalledInterval: 60 * 1000,
    maxStalledCount: 2,
  },
);

const cleanupWorker = new Worker<VideoJobData | Record<string, never>>(
  VIDEO_CLEANUP_QUEUE,
  async (job) => {
    if (job.name === 'delete-video' && 'videoId' in job.data) {
      await deleteVideoStorage(context, job.data.videoId);
      return;
    }
    if (job.name === 'sweep') {
      const result = await sweep(context);
      logger.info(result, 'video cleanup sweep finished');
    }
  },
  {
    connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }),
    concurrency: 1,
    lockDuration: 10 * 60 * 1000,
    stalledInterval: 60 * 1000,
    maxStalledCount: 2,
  },
);

const socialWorker = new Worker<Record<string, never>>(
  SOCIAL_QUEUE,
  async (job) => {
    if (job.name === 'recompute-hot-scores') {
      const result = await recomputeHotScores(db);
      logger.info(result, 'hot score recompute finished');
    }
    if (job.name === 'reconcile-counters') {
      const result = await reconcileCounters(db);
      logger.info(result, 'counter reconciliation finished');
    }
  },
  {
    connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }),
    concurrency: 1,
    lockDuration: 10 * 60 * 1000,
    stalledInterval: 60 * 1000,
    maxStalledCount: 2,
  },
);

const notificationWorker = new Worker<NotificationJobData>(
  NOTIFICATIONS_QUEUE,
  async (job) => runNotificationJob(context, pushQueue, job.data),
  {
    connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }),
    concurrency: env.WORKER_CONCURRENCY,
    lockDuration: 60 * 1000,
  },
);

const pushWorker = new Worker<PushJobData>(
  PUSH_QUEUE,
  async (job) => runPushJob(context, job.data),
  {
    connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }),
    concurrency: 4,
    lockDuration: 60 * 1000,
  },
);

const maintenanceWorker = new Worker<Record<string, never>>(
  MAINTENANCE_QUEUE,
  async (job) => {
    if (job.name === 'purge-deleted-accounts') {
      const count = await purgeDeletedAccounts(context);
      logger.info({ count }, 'deleted-account purge finished');
    }
    if (job.name === 'lift-expired-bans') {
      const count = await liftExpiredBans(context);
      logger.info({ count }, 'expired ban lift finished');
    }
  },
  {
    connection: new Redis(env.REDIS_URL, { maxRetriesPerRequest: null }),
    concurrency: 1,
    lockDuration: 10 * 60 * 1000,
  },
);

async function ownerOf(videoId: string): Promise<string | null> {
  const rows = await db
    .select({ ownerId: videos.ownerId })
    .from(videos)
    .where(eq(videos.id, videoId))
    .limit(1);
  return rows[0]?.ownerId ?? null;
}

function videoStatusNotification(
  type: 'video_ready' | 'video_failed',
  ownerId: string,
  videoId: string,
): NotificationJobData {
  return {
    type,
    recipientId: ownerId,
    actorId: null,
    videoId,
    commentId: null,
    commentText: null,
    groupKey: `${type}:${videoId}`,
    actorUsername: null,
  };
}

processingWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, videoId: job.data.videoId }, 'processing job completed');
  void ownerOf(job.data.videoId).then((ownerId) => {
    if (ownerId) {
      void enqueueNotification(
        notificationQueue,
        videoStatusNotification('video_ready', ownerId, job.data.videoId),
      );
    }
  });
});
processingWorker.on('failed', (job, error) => {
  logger.error({ err: error, jobId: job?.id, videoId: job?.data.videoId }, 'processing job failed');
  if (!job) return;
  const attempts = job.opts.attempts ?? 1;
  if (job.attemptsMade >= attempts) {
    void markVideoFailed(context, job.data.videoId, error);
    void ownerOf(job.data.videoId).then((ownerId) => {
      if (ownerId) {
        void enqueueNotification(
          notificationQueue,
          videoStatusNotification('video_failed', ownerId, job.data.videoId),
        );
      }
    });
  }
});
processingWorker.on('error', (error) => logger.error({ err: error }, 'processing worker error'));
cleanupWorker.on('error', (error) => logger.error({ err: error }, 'cleanup worker error'));
socialWorker.on('error', (error) => logger.error({ err: error }, 'social worker error'));
notificationWorker.on('error', (error) =>
  logger.error({ err: error }, 'notification worker error'),
);
pushWorker.on('error', (error) => logger.error({ err: error }, 'push worker error'));
maintenanceWorker.on('error', (error) => logger.error({ err: error }, 'maintenance worker error'));

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'stopping video worker');
  try {
    await Promise.all([
      processingWorker.close(),
      cleanupWorker.close(),
      socialWorker.close(),
      notificationWorker.close(),
      pushWorker.close(),
      maintenanceWorker.close(),
    ]);
    await cleanupQueue.close();
    await socialQueue.close();
    await notificationQueue.close();
    await pushQueue.close();
    await maintenanceQueue.close();
    await queueConnection.quit();
    await redis.quit();
    await pool.end();
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'worker shutdown failed');
    process.exit(1);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

try {
  await checkBinary(env.FFMPEG_PATH, '-version');
  await checkBinary(env.FFPROBE_PATH, '-version');
  await cleanupQueue.upsertJobScheduler(
    'video-cleanup-sweep',
    { every: 60 * 60 * 1000 },
    { name: 'sweep', data: {} },
  );
  await cleanupQueue.add(
    'sweep',
    {},
    { jobId: 'sweep:startup', removeOnComplete: true, removeOnFail: { count: 100 } },
  );
  await socialQueue.upsertJobScheduler(
    'hot-score-recompute',
    { every: 5 * 60 * 1000 },
    { name: 'recompute-hot-scores', data: {} },
  );
  await socialQueue.upsertJobScheduler(
    'counter-reconciliation',
    { every: 24 * 60 * 60 * 1000 },
    { name: 'reconcile-counters', data: {} },
  );
  await socialQueue.add(
    'recompute-hot-scores',
    {},
    { jobId: 'hot-score:startup', removeOnComplete: true, removeOnFail: { count: 100 } },
  );
  await maintenanceQueue.upsertJobScheduler(
    'account-purge',
    { every: 60 * 60 * 1000 },
    { name: 'purge-deleted-accounts', data: {} },
  );
  await maintenanceQueue.upsertJobScheduler(
    'expired-ban-lift',
    { every: 60 * 1000 },
    { name: 'lift-expired-bans', data: {} },
  );
  await processingWorker.waitUntilReady();
  await cleanupWorker.waitUntilReady();
  await socialWorker.waitUntilReady();
  await notificationWorker.waitUntilReady();
  await pushWorker.waitUntilReady();
  await maintenanceWorker.waitUntilReady();
  logger.info(
    { concurrency: env.WORKER_CONCURRENCY },
    'worker ready (processing, cleanup, social, notifications, push, maintenance)',
  );
} catch (error) {
  logger.error({ err: error }, 'failed to start worker');
  process.exit(1);
}
