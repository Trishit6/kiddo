import { and, desc, eq, lt, or, type SQL } from 'drizzle-orm';
import type { FeedResponse } from '@reel/shared';
import type { App } from '../app.js';
import { users, videos } from '../db/schema.js';
import { decodeCursor, encodeCursor } from '../lib/cursor.js';
import { badRequest } from '../lib/errors.js';
import { loadFeedItems, type FeedVideoRow } from './data.js';

const feedRowSelection = {
  id: videos.id,
  ownerId: videos.ownerId,
  caption: videos.caption,
  durationSeconds: videos.durationSeconds,
  width: videos.width,
  height: videos.height,
  storageKey: videos.storageKey,
  thumbnailKey: videos.thumbnailKey,
  likesCount: videos.likesCount,
  commentsCount: videos.commentsCount,
  savesCount: videos.savesCount,
  sharesCount: videos.sharesCount,
  viewsCount: videos.viewsCount,
  createdAt: videos.createdAt,
  authorId: users.id,
  authorUsername: users.username,
  authorDisplayName: users.displayName,
  authorAvatarKey: users.avatarKey,
};

export async function listFeedVideos(
  app: Pick<App, 'db' | 'config'>,
  where: SQL | undefined,
  cursor: string | undefined,
  limit: number,
  viewerId: string | null,
): Promise<FeedResponse> {
  const decoded = cursor ? decodeCursor(cursor) : null;
  let cursorCondition: SQL | undefined;
  if (decoded) {
    const createdAt = new Date(decoded.keyParts[0] ?? '');
    if (Number.isNaN(createdAt.getTime())) {
      throw badRequest('VALIDATION_ERROR', 'Invalid cursor');
    }
    cursorCondition = or(
      lt(videos.createdAt, createdAt),
      and(eq(videos.createdAt, createdAt), lt(videos.id, decoded.id)),
    );
  }

  const rows = await app.db
    .select(feedRowSelection)
    .from(videos)
    .innerJoin(users, eq(users.id, videos.ownerId))
    .where(and(where, cursorCondition))
    .orderBy(desc(videos.createdAt), desc(videos.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit) as FeedVideoRow[];
  const last = page.at(-1);
  return {
    items: await loadFeedItems(app, page, viewerId),
    nextCursor:
      rows.length > limit && last ? encodeCursor([last.createdAt.toISOString()], last.id) : null,
  };
}
