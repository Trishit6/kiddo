import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';
import { AppError } from '../lib/errors.js';

export const rateLimitPlugin = fp(async (app) => {
  await app.register(rateLimit, {
    global: true,
    max: app.config.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    redis: app.redis,
    nameSpace: 'reel-ratelimit:',
    keyGenerator: (request) => `${request.ip}:${request.routeOptions.url ?? request.url}`,
    skipOnError: true,
    errorResponseBuilder: (_request, context) =>
      new AppError(429, 'RATE_LIMITED', `Too many requests, retry in ${context.after}`),
  });
});
