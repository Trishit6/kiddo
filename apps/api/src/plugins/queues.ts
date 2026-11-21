import { Queue } from 'bullmq';
import Redis from 'ioredis';
import fp from 'fastify-plugin';
import {
  NOTIFICATIONS_QUEUE,
  VIDEO_CLEANUP_QUEUE,
  VIDEO_PROCESSING_QUEUE,
} from '../lib/queue-names.js';

export const queuesPlugin = fp(async (app) => {
  const connection = new Redis(app.config.REDIS_URL, { maxRetriesPerRequest: null });
  connection.on('error', (error: Error) => {
    app.log.error({ err: error }, 'BullMQ connection error');
  });

  const videoProcessing = new Queue(VIDEO_PROCESSING_QUEUE, { connection });
  const videoCleanup = new Queue(VIDEO_CLEANUP_QUEUE, { connection });
  const notifications = new Queue(NOTIFICATIONS_QUEUE, { connection });
  app.decorate('queues', { videoProcessing, videoCleanup, notifications });

  app.addHook('onClose', async () => {
    await Promise.all([videoProcessing.close(), videoCleanup.close(), notifications.close()]);
    await connection.quit();
  });
});
