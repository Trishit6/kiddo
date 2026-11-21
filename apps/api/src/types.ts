import type { Queue } from 'bullmq';
import type { Client as MinioClient } from 'minio';
import type { Redis } from 'ioredis';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UserRole } from '@reel/shared';
import type { Database } from './db/client.js';
import type { Env } from './env.js';
import type { MailProvider, TestMailProvider } from './plugins/mail.js';
import type { VideoProvider } from './video/provider.js';
import type { DomainEventBus } from './events.js';

export interface Queues {
  videoProcessing: Queue;
  videoCleanup: Queue;
  notifications: Queue;
}

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  emailVerified: boolean;
}

export type AuthHook = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

declare module 'fastify' {
  interface FastifyInstance {
    config: Env;
    db: Database;
    redis: Redis;
    s3: MinioClient;
    queues: Queues;
    mail: MailProvider;
    testMail?: TestMailProvider;
    videoProvider: VideoProvider;
    events: DomainEventBus;
    authenticate: AuthHook;
    optionalAuth: AuthHook;
    requireVerified: AuthHook;
    requireRole: (role: UserRole) => AuthHook;
  }

  interface FastifyRequest {
    user: AuthenticatedUser | null;
  }
}
