import { randomUUID } from 'node:crypto';
import { and, desc, eq, gte, inArray, notExists, notInArray, sql } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import type { App } from '../app.js';
import { follows, users, videoViews, videos } from '../db/schema.js';
import { publicFeedVisibility } from '../lib/visibility.js';
import { LocalFeedRanker, type FeedCandidate, type FeedRanker } from './ranker.js';
import { blockedAuthorIds } from './filters.js';

export const FEED_SESSION_TTL_SECONDS = 30 * 60;
export const FEED_CANDIDATE_COUNT = 200;
const ANON_VIEWS_TTL_SECONDS = 30 * 24 * 60 * 60;

interface FeedSessionRecord {
  v: 1;
  ids: string[];
}

function sessionKey(sessionId: string): string {
  return `reel:feed-session:${sessionId}`;
}

function anonViewsKey(anonId: string): string {
  return `reel:anon-views:${anonId}`;
}

export async function rememberAnonymousView(redis: Redis, anonId: string, videoId: string) {
  const key = anonViewsKey(anonId);
  await redis.sadd(key, videoId);
  await redis.expire(key, ANON_VIEWS_TTL_SECONDS);
}

async function readSession(redis: Redis, sessionId: string): Promise<string[] | null> {
  const raw = await redis.get(sessionKey(sessionId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FeedSessionRecord;
    if (parsed.v !== 1 || !Array.isArray(parsed.ids)) return null;
    return parsed.ids.filter((id): id is string => typeof id === 'string');
  } catch {
    return null;
  }
}

async function writeSession(redis: Redis, ids: string[]): Promise<string> {
  const sessionId = randomUUID();
  const record: FeedSessionRecord = { v: 1, ids };
  await redis.set(sessionKey(sessionId), JSON.stringify(record), 'EX', FEED_SESSION_TTL_SECONDS);
  return sessionId;
}

interface CandidateRow {
  id: string;
  authorId: string;
  hotScore: number;
  createdAt: Date;
  viewsCount: number;
}

async function candidateRows(
  app: Pick<App, 'db' | 'redis'>,
  viewerId: string | null,
  anonId: string | null,
  cutoff: Date | null,
  excludeIds: string[],
): Promise<CandidateRow[]> {
  const blocked = await blockedAuthorIds(viewerId);
  const anonViewed = viewerId || !anonId ? [] : await app.redis.smembers(anonViewsKey(anonId));
  const viewed = [...anonViewed, ...excludeIds];

  return app.db
    .select({
      id: videos.id,
      authorId: videos.ownerId,
      hotScore: videos.hotScore,
      createdAt: videos.createdAt,
      viewsCount: videos.viewsCount,
    })
    .from(videos)
    .innerJoin(users, eq(users.id, videos.ownerId))
    .where(
      and(
        publicFeedVisibility(),
        viewerId ? sql`${videos.ownerId} <> ${viewerId}` : undefined,
        cutoff ? gte(videos.createdAt, cutoff) : undefined,
        viewed.length > 0 ? notInArray(videos.id, viewed) : undefined,
        blocked.length > 0 ? notInArray(videos.ownerId, blocked) : undefined,
        viewerId
          ? notExists(
              app.db
                .select({ one: sql`1` })
                .from(videoViews)
                .where(and(eq(videoViews.videoId, videos.id), eq(videoViews.userId, viewerId))),
            )
          : undefined,
      ),
    )
    .orderBy(desc(videos.hotScore), desc(videos.createdAt), desc(videos.id))
    .limit(FEED_CANDIDATE_COUNT * 2);
}

async function followedAuthorIds(
  app: Pick<App, 'db'>,
  viewerId: string | null,
  candidates: CandidateRow[],
): Promise<Set<string>> {
  if (!viewerId || candidates.length === 0) return new Set();
  const authorIds = [...new Set(candidates.map((candidate) => candidate.authorId))];
  const rows = await app.db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(and(eq(follows.followerId, viewerId), inArray(follows.followingId, authorIds)));
  return new Set(rows.map((row) => row.followingId));
}

export async function buildFeedSession(
  app: Pick<App, 'db' | 'redis'>,
  viewerId: string | null,
  anonId: string | null,
  ranker: FeedRanker = new LocalFeedRanker(),
): Promise<string> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recent = await candidateRows(app, viewerId, anonId, cutoff, []);
  let candidates = recent;
  if (candidates.length < FEED_CANDIDATE_COUNT) {
    const recentIds = candidates.map((candidate) => candidate.id);
    const fallback = await candidateRows(app, viewerId, anonId, null, recentIds);
    candidates = [...candidates, ...fallback];
  }

  const followed = await followedAuthorIds(app, viewerId, candidates);
  const rankerInput: FeedCandidate[] = candidates.map((candidate) => ({
    ...candidate,
    followed: followed.has(candidate.authorId),
  }));
  const ranked = ranker.rank(rankerInput, FEED_CANDIDATE_COUNT, { now });
  return writeSession(
    app.redis,
    ranked.map((candidate) => candidate.id),
  );
}

export async function loadFeedSession(redis: Redis, sessionId: string): Promise<string[] | null> {
  return readSession(redis, sessionId);
}
