import { and, eq, inArray } from 'drizzle-orm';
import type { FeedItem } from '@reel/shared';
import type { App } from '../app.js';
import { follows, hashtags, likes, saves, videoHashtags } from '../db/schema.js';
import { avatarUrl } from '../lib/users.js';
import { mediaUrl } from '../lib/storage-keys.js';

export interface FeedVideoRow {
  id: string;
  ownerId: string;
  caption: string;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  storageKey: string | null;
  thumbnailKey: string | null;
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  sharesCount: number;
  viewsCount: number;
  createdAt: Date;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarKey: string | null;
}

export async function loadFeedItems(
  app: Pick<App, 'db' | 'config'>,
  rows: FeedVideoRow[],
  viewerId: string | null,
): Promise<FeedItem[]> {
  if (rows.length === 0) return [];
  const videoIds = rows.map((row) => row.id);
  const authorIds = [...new Set(rows.map((row) => row.authorId))];

  const [tagRows, likedRows, savedRows, followedRows] = await Promise.all([
    app.db
      .select({ videoId: videoHashtags.videoId, name: hashtags.name })
      .from(videoHashtags)
      .innerJoin(hashtags, eq(hashtags.id, videoHashtags.hashtagId))
      .where(inArray(videoHashtags.videoId, videoIds)),
    viewerId
      ? app.db
          .select({ videoId: likes.videoId })
          .from(likes)
          .where(and(eq(likes.userId, viewerId), inArray(likes.videoId, videoIds)))
      : Promise.resolve([]),
    viewerId
      ? app.db
          .select({ videoId: saves.videoId })
          .from(saves)
          .where(and(eq(saves.userId, viewerId), inArray(saves.videoId, videoIds)))
      : Promise.resolve([]),
    viewerId
      ? app.db
          .select({ followingId: follows.followingId })
          .from(follows)
          .where(and(eq(follows.followerId, viewerId), inArray(follows.followingId, authorIds)))
      : Promise.resolve([]),
  ]);

  const tagsByVideo = new Map<string, string[]>();
  for (const tag of tagRows) {
    const current = tagsByVideo.get(tag.videoId) ?? [];
    current.push(tag.name);
    tagsByVideo.set(tag.videoId, current);
  }
  const liked = new Set(likedRows.map((row) => row.videoId));
  const saved = new Set(savedRows.map((row) => row.videoId));
  const followed = new Set(followedRows.map((row) => row.followingId));

  return rows.map((row) => ({
    video: {
      id: row.id,
      caption: row.caption,
      hashtags: tagsByVideo.get(row.id) ?? [],
      durationSeconds: row.durationSeconds ?? 0,
      width: row.width ?? 0,
      height: row.height ?? 0,
      createdAt: row.createdAt.toISOString(),
      hlsUrl: mediaUrl(app, row.storageKey ?? ''),
      thumbnailUrl: mediaUrl(app, row.thumbnailKey ?? ''),
    },
    author: {
      id: row.authorId,
      username: row.authorUsername,
      displayName: row.authorDisplayName,
      avatarUrl: avatarUrl(app, row.authorAvatarKey),
    },
    counts: {
      likes: row.likesCount,
      comments: row.commentsCount,
      saves: row.savesCount,
      shares: row.sharesCount,
      views: row.viewsCount,
    },
    viewerState: {
      liked: liked.has(row.id),
      saved: saved.has(row.id),
      followingAuthor: followed.has(row.authorId),
    },
  }));
}
