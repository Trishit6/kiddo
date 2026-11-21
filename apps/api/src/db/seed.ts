import * as argon2 from 'argon2';
import { sql } from 'drizzle-orm';
import { createDb } from './client.js';
import { comments, follows, likes, users, videos } from './schema.js';
import { env } from '../env.js';

import { SEED_PASSWORD } from './seed-constants.js';

const USER_COUNT = 10;
const VIDEO_COUNT = 40;

/** Fixed UUIDs keep re-running the seed idempotent. */
function seededUuid(prefix: string, index: number): string {
  return `00000000-0000-4000-8000-${prefix}${String(index).padStart(11, '0')}`;
}

function captionsFor(index: number): string {
  const tags = ['#travel', '#food', '#music', '#fitness', '#art', '#cats'];
  const tag = tags[index % tags.length] ?? '#life';
  return `Seed clip ${index + 1} ${tag}`;
}

async function main(): Promise<void> {
  const { pool, db } = createDb(env.DATABASE_URL);
  try {
    const passwordHash = await argon2.hash(SEED_PASSWORD);
    const seededUsers = Array.from({ length: USER_COUNT }, (_, index) => ({
      id: seededUuid('1', index + 1),
      email: `seed-user-${index + 1}@example.com`,
      username: `seeduser${index + 1}`,
      displayName: `Seed User ${index + 1}`,
      bio: 'Seeded for local development',
      passwordHash,
      emailVerifiedAt: new Date(),
      role: index === 0 ? ('admin' as const) : ('user' as const),
      status: 'active' as const,
    }));

    await db
      .insert(users)
      .values(seededUsers)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          passwordHash: sql`excluded.password_hash`,
          emailVerifiedAt: sql`excluded.email_verified_at`,
          role: sql`excluded.role`,
          status: sql`excluded.status`,
        },
      });

    const seededVideos = Array.from({ length: VIDEO_COUNT }, (_, index) => ({
      id: seededUuid('2', index + 1),
      ownerId: seededUsers[index % USER_COUNT]?.id as string,
      caption: captionsFor(index),
      status: 'ready' as const,
      durationSeconds: 15 + (index % 45),
      width: 1080,
      height: 1920,
      storageKey: `videos/${seededUuid('2', index + 1)}/hls/master.m3u8`,
      thumbnailKey: `videos/${seededUuid('2', index + 1)}/thumb.jpg`,
      likesCount: index % 9,
      commentsCount: (index % 3) + 1,
      viewsCount: index * 13,
      sharesCount: index % 5,
    }));

    await db.insert(videos).values(seededVideos).onConflictDoNothing();

    const seededLikes = seededVideos.flatMap((video, index) =>
      Array.from({ length: video.likesCount }, (_, likeIndex) => ({
        id: seededUuid('3', index * 10 + likeIndex + 1),
        userId: seededUsers[(likeIndex + 1) % USER_COUNT]?.id as string,
        videoId: video.id,
      })),
    );
    if (seededLikes.length > 0) {
      await db.insert(likes).values(seededLikes).onConflictDoNothing();
    }

    const seededComments = seededVideos.flatMap((video, index) => {
      const firstCommentId = seededUuid('4', index * 10 + 1);
      return [
        {
          id: firstCommentId,
          videoId: video.id,
          userId: seededUsers[(index + 2) % USER_COUNT]?.id as string,
          body: 'Great clip!',
          replyCount: 1,
        },
        {
          id: seededUuid('4', index * 10 + 2),
          videoId: video.id,
          userId: seededUsers[(index + 3) % USER_COUNT]?.id as string,
          parentId: firstCommentId,
          body: 'Agreed!',
        },
      ];
    });
    await db.insert(comments).values(seededComments).onConflictDoNothing();

    const seededFollows = seededUsers.flatMap((follower, index) =>
      index === USER_COUNT - 1
        ? []
        : [
            {
              id: seededUuid('5', index + 1),
              followerId: follower.id,
              followingId: seededUsers[index + 1]?.id as string,
            },
          ],
    );
    await db.insert(follows).values(seededFollows).onConflictDoNothing();

    const counts = await db.select().from(users);
    console.log(
      `Seed complete: ${counts.length} users, ${seededVideos.length} videos, likes/comments/follows added. Seed users can log in with ${SEED_PASSWORD}.`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
