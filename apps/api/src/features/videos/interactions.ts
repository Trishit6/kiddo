import { and, eq, sql } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  errorResponseSchema,
  recordViewRequestSchema,
  recordViewResponseSchema,
  shareVideoResponseSchema,
  videoIdParamSchema,
  videoLikeResponseSchema,
  videoSaveResponseSchema,
} from '@reel/shared';
import { likes, saves, videoViews, videos } from '../../db/schema.js';
import { readAnonId } from '../../lib/anon.js';
import { AppError, unauthorized } from '../../lib/errors.js';
import { findInteractableVideo } from '../../lib/video-access.js';
import { rememberAnonymousView } from '../../feed/session.js';
import { interactionRateLimitKey } from '../../lib/rate-limit-key.js';

const VIEW_DEDUPE_TTL_SECONDS = 24 * 60 * 60;

async function requireVideo(
  app: Parameters<FastifyPluginAsyncZod>[0],
  videoId: string,
  request: FastifyRequest,
): Promise<{ id: string; ownerId: string }> {
  const video = await findInteractableVideo(app, videoId, request.user);
  if (!video) throw new AppError(404, 'VIDEO_NOT_FOUND', 'Video not found');
  return video;
}

export const videoInteractionsPlugin: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/:id/like',
    {
      schema: {
        description: 'Like a video (idempotent)',
        params: videoIdParamSchema,
        response: {
          200: videoLikeResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: app.requireVerified,
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
          keyGenerator: interactionRateLimitKey,
        },
      },
    },
    async (request) => {
      const userId = request.user?.id ?? '';
      const video = await requireVideo(app, request.params.id, request);
      const result = await app.db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(likes)
          .values({ userId, videoId: video.id })
          .onConflictDoNothing()
          .returning({ id: likes.id });
        if (!inserted) {
          const [current] = await tx
            .select({ likesCount: videos.likesCount })
            .from(videos)
            .where(eq(videos.id, video.id))
            .limit(1);
          return { changed: false, likesCount: current?.likesCount ?? 0 };
        }
        const [updated] = await tx
          .update(videos)
          .set({ likesCount: sql`${videos.likesCount} + 1` })
          .where(eq(videos.id, video.id))
          .returning({ likesCount: videos.likesCount });
        return { changed: true, likesCount: updated?.likesCount ?? 0 };
      });

      if (result.changed) {
        app.events.emit('video.liked', {
          videoId: video.id,
          actorId: userId,
          ownerId: video.ownerId,
        });
      }
      return { videoId: video.id, liked: true, likesCount: result.likesCount };
    },
  );

  app.delete(
    '/:id/like',
    {
      schema: {
        description: 'Remove a video like (idempotent)',
        params: videoIdParamSchema,
        response: {
          200: videoLikeResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: app.requireVerified,
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
          keyGenerator: interactionRateLimitKey,
        },
      },
    },
    async (request) => {
      const userId = request.user?.id ?? '';
      const video = await requireVideo(app, request.params.id, request);
      const likesCount = await app.db.transaction(async (tx) => {
        const [deleted] = await tx
          .delete(likes)
          .where(and(eq(likes.userId, userId), eq(likes.videoId, video.id)))
          .returning({ id: likes.id });
        if (!deleted) {
          const [current] = await tx
            .select({ likesCount: videos.likesCount })
            .from(videos)
            .where(eq(videos.id, video.id))
            .limit(1);
          return current?.likesCount ?? 0;
        }
        const [updated] = await tx
          .update(videos)
          .set({ likesCount: sql`greatest(${videos.likesCount} - 1, 0)` })
          .where(eq(videos.id, video.id))
          .returning({ likesCount: videos.likesCount });
        return updated?.likesCount ?? 0;
      });
      return { videoId: video.id, liked: false, likesCount };
    },
  );

  app.post(
    '/:id/save',
    {
      schema: {
        description: 'Save a video (idempotent)',
        params: videoIdParamSchema,
        response: {
          200: videoSaveResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: app.requireVerified,
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
          keyGenerator: interactionRateLimitKey,
        },
      },
    },
    async (request) => {
      const userId = request.user?.id ?? '';
      const video = await requireVideo(app, request.params.id, request);
      const result = await app.db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(saves)
          .values({ userId, videoId: video.id })
          .onConflictDoNothing()
          .returning({ id: saves.id });
        if (!inserted) {
          const [current] = await tx
            .select({ savesCount: videos.savesCount })
            .from(videos)
            .where(eq(videos.id, video.id))
            .limit(1);
          return { changed: false, savesCount: current?.savesCount ?? 0 };
        }
        const [updated] = await tx
          .update(videos)
          .set({ savesCount: sql`${videos.savesCount} + 1` })
          .where(eq(videos.id, video.id))
          .returning({ savesCount: videos.savesCount });
        return { changed: true, savesCount: updated?.savesCount ?? 0 };
      });
      return { videoId: video.id, saved: true, savesCount: result.savesCount };
    },
  );

  app.delete(
    '/:id/save',
    {
      schema: {
        description: 'Remove a saved video (idempotent)',
        params: videoIdParamSchema,
        response: {
          200: videoSaveResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: app.requireVerified,
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
          keyGenerator: interactionRateLimitKey,
        },
      },
    },
    async (request) => {
      const userId = request.user?.id ?? '';
      const video = await requireVideo(app, request.params.id, request);
      const savesCount = await app.db.transaction(async (tx) => {
        const [deleted] = await tx
          .delete(saves)
          .where(and(eq(saves.userId, userId), eq(saves.videoId, video.id)))
          .returning({ id: saves.id });
        if (!deleted) {
          const [current] = await tx
            .select({ savesCount: videos.savesCount })
            .from(videos)
            .where(eq(videos.id, video.id))
            .limit(1);
          return current?.savesCount ?? 0;
        }
        const [updated] = await tx
          .update(videos)
          .set({ savesCount: sql`greatest(${videos.savesCount} - 1, 0)` })
          .where(eq(videos.id, video.id))
          .returning({ savesCount: videos.savesCount });
        return updated?.savesCount ?? 0;
      });
      return { videoId: video.id, saved: false, savesCount };
    },
  );

  app.post(
    '/:id/view',
    {
      schema: {
        description: 'Record a video view once per viewer per 24 hours',
        params: videoIdParamSchema,
        body: recordViewRequestSchema,
        response: {
          200: recordViewResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: app.optionalAuth,
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
          keyGenerator: (request: FastifyRequest) => request.ip,
        },
      },
    },
    async (request) => {
      const anonId = readAnonId(request);
      const userId = request.user?.id ?? null;
      if (!userId && !anonId) {
        throw unauthorized('AUTH_REQUIRED', 'Anonymous views require an x-anon-id header');
      }
      const video = await requireVideo(app, request.params.id, request);
      const qualifying = request.body.completed || request.body.watchedMs >= 2_000;
      const [current] = await app.db
        .select({ viewsCount: videos.viewsCount })
        .from(videos)
        .where(eq(videos.id, video.id))
        .limit(1);
      if (!qualifying) {
        return { counted: false, viewsCount: current?.viewsCount ?? 0 };
      }

      const key = `reel:view:${video.id}:${userId ?? anonId}`;
      const acquired = await app.redis.set(key, '1', 'EX', VIEW_DEDUPE_TTL_SECONDS, 'NX');
      if (acquired !== 'OK') {
        return { counted: false, viewsCount: current?.viewsCount ?? 0 };
      }

      try {
        const viewsCount = await app.db.transaction(async (tx) => {
          await tx.insert(videoViews).values({
            videoId: video.id,
            userId,
            anonId,
            watchedMs: request.body.watchedMs,
            completed: request.body.completed,
          });
          const [updated] = await tx
            .update(videos)
            .set({ viewsCount: sql`${videos.viewsCount} + 1` })
            .where(eq(videos.id, video.id))
            .returning({ viewsCount: videos.viewsCount });
          return updated?.viewsCount ?? 0;
        });
        if (anonId) await rememberAnonymousView(app.redis, anonId, video.id);
        return { counted: true, viewsCount };
      } catch (error) {
        await app.redis.del(key);
        throw error;
      }
    },
  );

  app.post(
    '/:id/share',
    {
      schema: {
        description: 'Record a video share',
        params: videoIdParamSchema,
        response: {
          200: shareVideoResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: app.authenticate,
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
          keyGenerator: interactionRateLimitKey,
        },
      },
    },
    async (request) => {
      const video = await requireVideo(app, request.params.id, request);
      const [updated] = await app.db
        .update(videos)
        .set({ sharesCount: sql`${videos.sharesCount} + 1` })
        .where(eq(videos.id, video.id))
        .returning({ sharesCount: videos.sharesCount });
      return { videoId: video.id, sharesCount: updated?.sharesCount ?? 0 };
    },
  );
};
