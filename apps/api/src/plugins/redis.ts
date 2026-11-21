import Redis from 'ioredis';
import fp from 'fastify-plugin';

export const redisPlugin = fp(async (app) => {
  const redis = new Redis(app.config.REDIS_URL, { maxRetriesPerRequest: null });
  redis.on('error', (error: Error) => {
    app.log.error({ err: error }, 'Redis connection error');
  });
  app.decorate('redis', redis);
  app.addHook('onClose', async () => {
    await redis.quit();
  });
});
