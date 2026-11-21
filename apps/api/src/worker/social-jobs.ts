import { and, asc, eq, gt, gte, inArray, isNull, sql } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { videos } from '../db/schema.js';

export interface HotScoreWeights {
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  completedViews: number;
}

export const defaultHotScoreConfig = {
  weights: {
    likes: 1,
    comments: 2,
    saves: 2,
    shares: 3,
    completedViews: 1,
  } satisfies HotScoreWeights,
  ageOffsetHours: 2,
  decayExponent: 1.5,
  activeWindowDays: 30,
  batchSize: 500,
} as const;

export async function recomputeHotScores(
  db: Database,
  config = defaultHotScoreConfig,
): Promise<{ videosUpdated: number }> {
  const cutoff = new Date(Date.now() - config.activeWindowDays * 24 * 60 * 60 * 1000);
  let lastId = '00000000-0000-0000-0000-000000000000';
  let videosUpdated = 0;

  for (;;) {
    const batch = await db
      .select({ id: videos.id })
      .from(videos)
      .where(
        and(
          eq(videos.status, 'ready'),
          isNull(videos.deletedAt),
          gte(videos.createdAt, cutoff),
          gt(videos.id, lastId),
        ),
      )
      .orderBy(asc(videos.id))
      .limit(config.batchSize);
    if (batch.length === 0) break;
    lastId = batch.at(-1)?.id ?? lastId;
    const ids = batch.map((row) => row.id);
    const ageHours = sql`(extract(epoch from (now() - ${videos.createdAt})) / 3600)`;
    await db
      .update(videos)
      .set({
        hotScore: sql`(
          ${videos.likesCount} * ${config.weights.likes}
          + ${videos.commentsCount} * ${config.weights.comments}
          + ${videos.savesCount} * ${config.weights.saves}
          + ${videos.sharesCount} * ${config.weights.shares}
          + (select count(*) from video_views vv where vv.video_id = ${videos.id} and vv.completed = true) * ${config.weights.completedViews}
        ) / power(${ageHours} + ${config.ageOffsetHours}, ${config.decayExponent})`,
      })
      .where(inArray(videos.id, ids));
    videosUpdated += ids.length;
  }

  return { videosUpdated };
}

export interface CounterReconciliationResult {
  likedVideos: number;
  commentedVideos: number;
  savedVideos: number;
  followers: number;
  following: number;
  replyCounts: number;
}

async function correctedRows(db: Database, query: ReturnType<typeof sql>): Promise<number> {
  const result = await db.execute(query);
  return result.rowCount ?? 0;
}

export async function reconcileCounters(db: Database): Promise<CounterReconciliationResult> {
  const likedVideos = await correctedRows(
    db,
    sql`update videos v set likes_count = (select count(*)::int from likes l where l.video_id = v.id)
        where v.likes_count <> (select count(*)::int from likes l where l.video_id = v.id)`,
  );
  const commentedVideos = await correctedRows(
    db,
    sql`update videos v set comments_count = (
          select count(*)::int from comments c where c.video_id = v.id and c.deleted_at is null
        )
        where v.comments_count <> (
          select count(*)::int from comments c where c.video_id = v.id and c.deleted_at is null
        )`,
  );
  const savedVideos = await correctedRows(
    db,
    sql`update videos v set saves_count = (select count(*)::int from saves s where s.video_id = v.id)
        where v.saves_count <> (select count(*)::int from saves s where s.video_id = v.id)`,
  );
  const followers = await correctedRows(
    db,
    sql`update users u set followers_count = (
          select count(*)::int from follows f where f.following_id = u.id
        )
        where u.followers_count <> (
          select count(*)::int from follows f where f.following_id = u.id
        )`,
  );
  const following = await correctedRows(
    db,
    sql`update users u set following_count = (
          select count(*)::int from follows f where f.follower_id = u.id
        )
        where u.following_count <> (
          select count(*)::int from follows f where f.follower_id = u.id
        )`,
  );
  const replyCounts = await correctedRows(
    db,
    sql`update comments c set replies_count = (
          select count(*)::int from comments r
          where r.parent_id = c.id and r.deleted_at is null
        )
        where c.replies_count <> (
          select count(*)::int from comments r
          where r.parent_id = c.id and r.deleted_at is null
        )`,
  );
  return { likedVideos, commentedVideos, savedVideos, followers, following, replyCounts };
}
