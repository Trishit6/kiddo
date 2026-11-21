import { and, eq, isNotNull, lte } from 'drizzle-orm';
import { removePrefixes } from '../lib/s3-objects.js';
import { videoStoragePrefixes } from '../lib/storage-keys.js';
import { users, videos } from '../db/schema.js';
import type { WorkerContext } from './context.js';

/** Permanently deletes accounts whose 30-day recovery window has elapsed. */
export async function purgeDeletedAccounts(context: WorkerContext): Promise<number> {
  const due = await context.db
    .select({ id: users.id, avatarKey: users.avatarKey })
    .from(users)
    .where(and(isNotNull(users.scheduledPurgeAt), lte(users.scheduledPurgeAt, new Date())));
  let purged = 0;
  for (const user of due) {
    const owned = await context.db
      .select({ id: videos.id })
      .from(videos)
      .where(eq(videos.ownerId, user.id));
    const prefixes = owned.flatMap((video) => videoStoragePrefixes(video.id));
    if (user.avatarKey) prefixes.push(user.avatarKey);
    if (prefixes.length > 0) {
      await removePrefixes(context.s3, context.config.S3_BUCKET, prefixes);
    }
    await context.db.delete(users).where(eq(users.id, user.id));
    purged += 1;
  }
  return purged;
}

/** Lifts bans whose expiry has passed. */
export async function liftExpiredBans(context: WorkerContext): Promise<number> {
  const result = await context.db
    .update(users)
    .set({ status: 'active', bannedUntil: null })
    .where(and(eq(users.status, 'banned'), lte(users.bannedUntil, new Date())))
    .returning({ id: users.id });
  return result.length;
}
