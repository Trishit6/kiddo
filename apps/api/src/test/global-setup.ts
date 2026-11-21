import Redis from 'ioredis';
import { runMigrations } from '../db/migrate.js';

export async function setup(): Promise<void> {
  const databaseUrl =
    process.env.TEST_DATABASE_URL ?? 'postgresql://reel:reel@localhost:5432/reel_test';
  const redisUrl = process.env.TEST_REDIS_URL ?? 'redis://localhost:6380/1';

  await runMigrations(databaseUrl);

  const redis = new Redis(redisUrl, { maxRetriesPerRequest: null });
  try {
    await redis.flushdb();
  } finally {
    await redis.quit();
  }
}
