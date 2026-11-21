import type { Client as MinioClient } from 'minio';
import type { Logger } from 'pino';
import type { Redis } from 'ioredis';
import type { Database } from '../db/client.js';
import type { Env } from '../env.js';

export interface WorkerContext {
  config: Env;
  db: Database;
  s3: MinioClient;
  redis: Redis;
  logger: Logger;
}
