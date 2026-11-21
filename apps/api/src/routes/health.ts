import { healthResponseSchema, errorResponseSchema } from '@reel/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { checkDatabase } from '../plugins/db.js';

function statusPayload() {
  return {
    status: 'ok' as const,
    service: 'reel-api' as const,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    { schema: { description: 'Liveness probe', response: { 200: healthResponseSchema } } },
    async () => statusPayload(),
  );

  app.get(
    '/ready',
    {
      schema: {
        description: 'Readiness probe (Postgres + Redis)',
        response: { 200: healthResponseSchema, 503: errorResponseSchema },
      },
    },
    async (_request, reply) => {
      try {
        await checkDatabase(app.db);
        await app.redis.ping();
      } catch (error) {
        app.log.error({ err: error }, 'readiness check failed');
        return reply.code(503).send({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Dependency check failed',
            requestId: reply.request.id,
          },
        });
      }
      return statusPayload();
    },
  );
};
