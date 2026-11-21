import { randomUUID } from 'node:crypto';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { adminPlugin } from './features/admin/plugin.js';
import { authPlugin } from './features/auth/plugin.js';
import { commentsPlugin } from './features/comments/plugin.js';
import { feedPlugin } from './features/feed/plugin.js';
import { notificationsPlugin } from './features/notifications/plugin.js';
import { sharePlugin } from './features/share/plugin.js';
import { usersPlugin } from './features/users/plugin.js';
import { videosPlugin } from './features/videos/plugin.js';
import { videoInteractionsPlugin } from './features/videos/interactions.js';
import { env } from './env.js';
import { DomainEventBus } from './events.js';
import { appAuthPlugin } from './plugins/app-auth.js';
import { installErrorHandler } from './plugins/error-handler.js';
import { dbPlugin } from './plugins/db.js';
import { mailPlugin } from './plugins/mail.js';
import { queuesPlugin } from './plugins/queues.js';
import { rateLimitPlugin } from './plugins/rate-limit.js';
import { redisPlugin } from './plugins/redis.js';
import { s3Plugin } from './plugins/s3.js';
import { videoProviderPlugin } from './plugins/video-provider.js';
import { healthRoutes } from './routes/health.js';
import './types.js';

export function buildApp() {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
    genReqId: () => randomUUID(),
    requestIdHeader: 'x-request-id',
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorate('config', env);
  app.decorate('events', new DomainEventBus());
  installErrorHandler(app);

  void app.register(dbPlugin);
  void app.register(redisPlugin);
  void app.register(s3Plugin);
  void app.register(videoProviderPlugin);
  void app.register(queuesPlugin);
  void app.register(mailPlugin);
  void app.register(appAuthPlugin);

  void app.register(cors, { origin: true, credentials: true });
  void app.register(helmet);
  void app.register(rateLimitPlugin);
  void app.register(cookie, { secret: app.config.COOKIE_SECRET, hook: 'onRequest' });
  void app.register(swagger, {
    openapi: { info: { title: 'Reel API', version: '0.1.0' } },
    transform: jsonSchemaTransform,
  });
  void app.register(swaggerUi, { routePrefix: '/docs' });

  void app.register(healthRoutes);
  void app.register(sharePlugin);
  void app.register(authPlugin, { prefix: '/auth' });
  void app.register(usersPlugin, { prefix: '/users' });
  void app.register(videosPlugin, { prefix: '/videos' });
  void app.register(videoInteractionsPlugin, { prefix: '/videos' });
  void app.register(feedPlugin);
  void app.register(commentsPlugin, { prefix: '/comments' });
  void app.register(notificationsPlugin, { prefix: '/notifications' });
  void app.register(adminPlugin, { prefix: '/admin' });

  return app;
}

export type App = ReturnType<typeof buildApp>;
