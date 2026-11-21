import * as argon2 from 'argon2';
import { sql } from 'drizzle-orm';
import { createDb } from './client.js';
import {
  comments,
  follows,
  hashtags,
  likes,
  saves,
  users,
  videoHashtags,
  videoViews,
  videos,
} from './schema.js';
import { env } from '../env.js';
import { SEED_PASSWORD } from './seed-constants.js';

const USER_COUNT = 5_000;
const VIDEO_COUNT = 50_000;
const TAG_COUNT = 30;
const BATCH_SIZE = 2_000;

function seededUuid(prefix: string, index: number): string {
  return `00000000-0000-4000-8000-${prefix}${String(index).padStart(11, '0')}`;
}

function userId(index: number): string {
  return seededUuid('a', index + 1);
}

function videoId(index: number): string {
  return seededUuid('b', index + 1);
}

function ageFor(index: number): Date {
  const days = (index * 7) % 60;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000 - (index % 24) * 60 * 60 * 1000);
}

async function insertBatches<T>(
  label: string,
  rows: T[],
  insert: (batch: T[]) => Promise<unknown>,
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    await insert(rows.slice(offset, offset + BATCH_SIZE));
    if (offset % (BATCH_SIZE * 10) === 0) {
      console.log(`${label}: ${Math.min(offset + BATCH_SIZE, rows.length)}/${rows.length}`);
    }
  }
}

async function main(): Promise<void> {
  const { pool, db } = createDb(env.DATABASE_URL);
  try {
    const passwordHash = await argon2.hash(SEED_PASSWORD);
    const seededUsers = Array.from({ length: USER_COUNT }, (_, index) => ({
      id: userId(index),
      email: `load-user-${index + 1}@example.com`,
      username: `loaduser${index + 1}`,
      displayName: `Load User ${index + 1}`,
      bio: 'Load-test fixture',
      passwordHash,
      emailVerifiedAt: new Date(),
      role: 'user' as const,
      status: 'active' as const,
      followersCount: 20,
      followingCount: 20,
      createdAt: ageFor(index * 3),
    }));
    await insertBatches('users', seededUsers, (batch) =>
      db.insert(users).values(batch).onConflictDoNothing(),
    );

    const tagNames = Array.from({ length: TAG_COUNT }, (_, index) => `loadtag${index + 1}`);
    await db
      .insert(hashtags)
      .values(tagNames.map((name) => ({ name })))
      .onConflictDoNothing({ target: hashtags.name });
    const tagRows = await db.select({ id: hashtags.id, name: hashtags.name }).from(hashtags);
    const tagIds = tagNames.map(
      (name) => tagRows.find((row) => row.name === name)?.id ?? tagRows[0]?.id ?? '',
    );

    const seededVideos = Array.from({ length: VIDEO_COUNT }, (_, index) => {
      const ageDays = ((index * 7) % 60) as number;
      const hiddenKind = index % 100;
      const visibility = hiddenKind === 0 ? 'private' : hiddenKind === 1 ? 'unlisted' : 'public';
      const status = hiddenKind === 2 ? 'processing' : hiddenKind === 3 ? 'failed' : 'ready';
      const likes = 4;
      const commentsCount = 2;
      const savesCount = 2;
      const shares = index % 7;
      const views = 4;
      const hotScore =
        (likes + commentsCount * 2 + savesCount * 2 + shares * 3 + views * 4) /
        Math.pow(ageDays * 24 + 2, 1.5);
      return {
        id: videoId(index),
        ownerId: userId(index % USER_COUNT),
        caption: `Load clip ${index + 1} #${tagNames[index % TAG_COUNT]}`,
        status: status as 'ready' | 'processing' | 'failed',
        visibility: visibility as 'public' | 'private' | 'unlisted',
        durationSeconds: 10 + (index % 50),
        width: 1080,
        height: 1920,
        storageKey: `videos/${videoId(index)}/hls/master.m3u8`,
        thumbnailKey: `videos/${videoId(index)}/thumb.jpg`,
        likesCount: likes,
        commentsCount,
        savesCount,
        sharesCount: shares,
        viewsCount: views,
        hotScore,
        createdAt: ageFor(index),
        deletedAt: hiddenKind === 4 ? new Date() : null,
      };
    });
    await insertBatches('videos', seededVideos, (batch) =>
      db.insert(videos).values(batch).onConflictDoNothing(),
    );

    const videoTags = seededVideos.map((video, index) => ({
      videoId: video.id,
      hashtagId: tagIds[index % TAG_COUNT] ?? '',
    }));
    await insertBatches('video_hashtags', videoTags, (batch) =>
      db.insert(videoHashtags).values(batch).onConflictDoNothing(),
    );

    const seededLikes = Array.from({ length: VIDEO_COUNT * 4 }, (_, index) => {
      const videoIndex = Math.floor(index / 4);
      const likeIndex = index % 4;
      return {
        id: seededUuid('c', index + 1),
        userId: userId((videoIndex * 3 + likeIndex) % USER_COUNT),
        videoId: videoId(videoIndex),
        createdAt: ageFor(videoIndex),
      };
    });
    await insertBatches('likes', seededLikes, (batch) =>
      db.insert(likes).values(batch).onConflictDoNothing(),
    );

    const seededSaves = Array.from({ length: VIDEO_COUNT * 2 }, (_, index) => {
      const videoIndex = Math.floor(index / 2);
      const saveIndex = index % 2;
      return {
        id: seededUuid('f', index + 1),
        userId: userId((videoIndex * 5 + saveIndex) % USER_COUNT),
        videoId: videoId(videoIndex),
        createdAt: ageFor(videoIndex),
      };
    });
    await insertBatches('saves', seededSaves, (batch) =>
      db.insert(saves).values(batch).onConflictDoNothing(),
    );

    const seededComments = Array.from({ length: VIDEO_COUNT * 2 }, (_, index) => {
      const videoIndex = Math.floor(index / 2);
      const reply = index % 2 === 1;
      const parentId = reply ? seededUuid('d', videoIndex * 2 + 1) : null;
      const parentAuthor = userId((videoIndex * 7 + 2) % USER_COUNT);
      return {
        id: seededUuid('d', index + 1),
        videoId: videoId(videoIndex),
        userId: reply ? userId((videoIndex * 7 + 3) % USER_COUNT) : parentAuthor,
        parentId,
        replyToUserId: reply ? parentAuthor : null,
        body: reply ? `Load reply ${index + 1}` : `Load comment ${index + 1}`,
        replyCount: reply ? 0 : 1,
        createdAt: ageFor(videoIndex),
      };
    });
    await insertBatches('comments', seededComments, (batch) =>
      db.insert(comments).values(batch).onConflictDoNothing(),
    );

    const seededFollows = Array.from({ length: USER_COUNT * 20 }, (_, index) => {
      const followerIndex = Math.floor(index / 20);
      const followIndex = index % 20;
      return {
        id: seededUuid('e', index + 1),
        followerId: userId(followerIndex),
        followingId: userId((followerIndex + followIndex + 1) % USER_COUNT),
        createdAt: ageFor(index),
      };
    }).filter((follow) => follow.followerId !== follow.followingId);
    await insertBatches('follows', seededFollows, (batch) =>
      db.insert(follows).values(batch).onConflictDoNothing(),
    );

    const seededViews = Array.from({ length: VIDEO_COUNT * 4 }, (_, index) => {
      const videoIndex = Math.floor(index / 4);
      return {
        id: seededUuid('9', index + 1),
        videoId: videoId(videoIndex),
        userId: userId((videoIndex * 3 + (index % 4)) % USER_COUNT),
        watchedMs: 3_000 + (index % 10_000),
        completed: index % 3 === 0,
        createdAt: ageFor(videoIndex),
      };
    });
    await insertBatches('video_views', seededViews, (batch) =>
      db.insert(videoViews).values(batch).onConflictDoNothing(),
    );

    await db.execute(sql`analyze`);
    console.log(
      `Load seed complete: ${USER_COUNT} users, ${VIDEO_COUNT} videos, ${seededLikes.length} likes, ${seededComments.length} comments, ${seededFollows.length} follows.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error('Load seed failed:', error);
  process.exitCode = 1;
});
