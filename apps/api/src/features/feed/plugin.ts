import { and, desc, eq, exists, gte, inArray, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  errorResponseSchema,
  feedItemResponseSchema,
  feedResponseSchema,
  hashtagParamSchema,
  socialListQuerySchema,
  trendingResponseSchema,
  videoIdParamSchema,
} from '@reel/shared';
import type { FeedItem } from '@reel/shared';
import { follows, hashtags, users, videoHashtags, videos } from '../../db/schema.js';
import { decodeCursor, encodeCursor } from '../../lib/cursor.js';
import { AppError, badRequest } from '../../lib/errors.js';
import { readAnonId } from '../../lib/anon.js';
import { directVideoVisibility, publicFeedVisibility } from '../../lib/visibility.js';
import { loadFeedItems, type FeedVideoRow } from '../../feed/data.js';
import { listFeedVideos } from '../../feed/queries.js';
import { buildFeedSession, loadFeedSession } from '../../feed/session.js';

const TRENDING_TTL_SECONDS = 2 * 60;
const TRENDING_CACHE_KEY = 'reel:trending';

/** Viewer-independent cache payload; viewerState is hydrated per request. */
const trendingCacheSchema = z.object({
  hashtags: z.array(z.object({ tag: z.string(), videosCount: z.number().int().nonnegative() })),
  videoIds: z.array(z.uuid()),
});

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

async function videosByIds(
  app: Parameters<FastifyPluginAsyncZod>[0],
  ids: string[],
  viewerId: string | null,
): Promise<FeedItem[]> {
  if (ids.length === 0) return [];
  const rows = await app.db
    .select(feedRowSelection)
    .from(videos)
    .innerJoin(users, eq(users.id, videos.ownerId))
    .where(and(inArray(videos.id, ids), publicFeedVisibility()));
  const byId = new Map(rows.map((row) => [row.id, row as FeedVideoRow]));
  const ordered = ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
  return loadFeedItems(app, ordered, viewerId);
}

export const feedPlugin: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/feed/for-you',
    {
      schema: {
        description: 'Personalised For You feed with stable feed sessions',
        querystring: socialListQuerySchema,
        response: { 200: feedResponseSchema, 400: errorResponseSchema },
      },
      preHandler: app.optionalAuth,
    },
    async (request) => {
      const viewerId = request.user?.id ?? null;
      const anonId = readAnonId(request);
      const decoded = request.query.cursor ? decodeCursor(request.query.cursor) : null;
      let sessionId: string;
      let ids: string[];
      let offset = 0;

      if (decoded) {
        const parsedOffset = Number(decoded.keyParts[0]);
        if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
          throw badRequest('VALIDATION_ERROR', 'Invalid cursor');
        }
        sessionId = decoded.id;
        const stored = await loadFeedSession(app.redis, sessionId);
        if (stored) {
          ids = stored;
          offset = parsedOffset;
        } else {
          // The session expired (or Redis was reset). Rebuild and resume at the
          // requested offset so the client does not receive page 1 again.
          sessionId = await buildFeedSession(app, viewerId, anonId);
          ids = (await loadFeedSession(app.redis, sessionId)) ?? [];
          offset = parsedOffset;
        }
      } else {
        sessionId = await buildFeedSession(app, viewerId, anonId);
        ids = (await loadFeedSession(app.redis, sessionId)) ?? [];
      }

      const pageIds = ids.slice(offset, offset + request.query.limit);
      const items = await videosByIds(app, pageIds, viewerId);
      const nextOffset = offset + request.query.limit;
      return {
        items,
        nextCursor: nextOffset < ids.length ? encodeCursor([String(nextOffset)], sessionId) : null,
      };
    },
  );

  app.get(
    '/videos/:id/feed-item',
    {
      schema: {
        description: 'Single video with social counts and viewer state',
        params: videoIdParamSchema,
        response: {
          200: feedItemResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: app.optionalAuth,
    },
    async (request) => {
      const [row] = await app.db
        .select(feedRowSelection)
        .from(videos)
        .innerJoin(users, eq(users.id, videos.ownerId))
        .where(and(eq(videos.id, request.params.id), directVideoVisibility(request.user)))
        .limit(1);
      if (!row) throw new AppError(404, 'VIDEO_NOT_FOUND', 'Video not found');
      const [item] = await loadFeedItems(app, [row as FeedVideoRow], request.user?.id ?? null);
      if (!item) throw new AppError(404, 'VIDEO_NOT_FOUND', 'Video not found');
      return { item };
    },
  );

  app.get(
    '/feed/following',
    {
      schema: {
        description: 'Chronological feed from authors the viewer follows',
        querystring: socialListQuerySchema,
        response: { 200: feedResponseSchema, 400: errorResponseSchema, 401: errorResponseSchema },
      },
      preHandler: app.authenticate,
    },
    async (request) => {
      const viewerId = request.user?.id ?? null;
      return listFeedVideos(
        app,
        and(
          publicFeedVisibility(),
          exists(
            app.db
              .select({ one: sql`1` })
              .from(follows)
              .where(
                and(
                  eq(follows.followerId, viewerId ?? ''),
                  eq(follows.followingId, videos.ownerId),
                ),
              ),
          ),
        ),
        request.query.cursor,
        request.query.limit,
        viewerId,
      );
    },
  );

  app.get(
    '/hashtags/:tag/videos',
    {
      schema: {
        description: 'Public videos for a hashtag',
        params: hashtagParamSchema,
        querystring: socialListQuerySchema,
        response: { 200: feedResponseSchema, 400: errorResponseSchema },
      },
      preHandler: app.optionalAuth,
    },
    async (request) => {
      const tag = request.params.tag.toLowerCase();
      return listFeedVideos(
        app,
        and(
          publicFeedVisibility(),
          exists(
            app.db
              .select({ one: sql`1` })
              .from(videoHashtags)
              .innerJoin(hashtags, eq(hashtags.id, videoHashtags.hashtagId))
              .where(and(eq(videoHashtags.videoId, videos.id), eq(hashtags.name, tag))),
          ),
        ),
        request.query.cursor,
        request.query.limit,
        request.user?.id ?? null,
      );
    },
  );

  app.get(
    '/explore/trending',
    {
      schema: {
        description: 'Trending hashtags in the last 48 hours and top hot videos',
        response: { 200: trendingResponseSchema },
      },
      preHandler: app.optionalAuth,
    },
    async (request) => {
      const viewerId = request.user?.id ?? null;
      const cached = await app.redis.get(TRENDING_CACHE_KEY);
      if (cached) {
        try {
          const parsed = trendingCacheSchema.parse(JSON.parse(cached));
          return {
            hashtags: parsed.hashtags,
            videos: await videosByIds(app, parsed.videoIds, viewerId),
          };
        } catch {
          await app.redis.del(TRENDING_CACHE_KEY);
        }
      }

      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const [trendingTags, topRows] = await Promise.all([
        app.db
          .select({ tag: hashtags.name, videosCount: sql<number>`count(*)::int` })
          .from(videos)
          .innerJoin(users, eq(users.id, videos.ownerId))
          .innerJoin(videoHashtags, eq(videoHashtags.videoId, videos.id))
          .innerJoin(hashtags, eq(hashtags.id, videoHashtags.hashtagId))
          .where(and(publicFeedVisibility(), gte(videos.createdAt, cutoff)))
          .groupBy(hashtags.name)
          .orderBy(desc(sql`count(*)`))
          .limit(10),
        app.db
          .select({ id: videos.id })
          .from(videos)
          .innerJoin(users, eq(users.id, videos.ownerId))
          .where(publicFeedVisibility())
          .orderBy(desc(videos.hotScore), desc(videos.createdAt))
          .limit(10),
      ]);

      const videoIds = topRows.map((row) => row.id);
      await app.redis.set(
        TRENDING_CACHE_KEY,
        JSON.stringify({ hashtags: trendingTags, videoIds }),
        'EX',
        TRENDING_TTL_SECONDS,
      );
      return { hashtags: trendingTags, videos: await videosByIds(app, videoIds, viewerId) };
    },
  );
};
