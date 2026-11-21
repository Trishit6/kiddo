import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

/** Feature modules are registered now; their routes land in later phases. */
export function createFeaturePlugin(name: string): FastifyPluginAsyncZod {
  return async (app) => {
    app.log.debug({ feature: name }, 'feature plugin registered');
  };
}
