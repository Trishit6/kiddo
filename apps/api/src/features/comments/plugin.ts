import { and, eq, sql } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  commentLikeResponseSchema,
  commentListResponseSchema,
  errorResponseSchema,
  messageResponseSchema,
  socialListQuerySchema,
  videoIdParamSchema,
} from '@reel/shared';
import { commentLikes, comments, videos } from '../../db/schema.js';
import { AppError, badRequest, forbidden } from '../../lib/errors.js';
import { findInteractableVideo } from '../../lib/video-access.js';
import { listReplies } from './queries.js';
import { interactionRateLimitKey } from '../../lib/rate-limit-key.js';

const commentIdParamSchema = videoIdParamSchema;

export const commentsPlugin: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/:id/replies',
    {
      schema: {
        description: 'List replies to a top-level comment, oldest first',
        params: commentIdParamSchema,
        querystring: socialListQuerySchema,
        response: {
          200: commentListResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: app.optionalAuth,
    },
    async (request) => {
      const [parent] = await app.db
        .select({ id: comments.id, videoId: comments.videoId })
        .from(comments)
        .where(eq(comments.id, request.params.id))
        .limit(1);
      if (!parent) throw badRequest('COMMENT_NOT_FOUND', 'Comment not found');
      const video = await findInteractableVideo(app, parent.videoId, request.user);
      if (!video) throw new AppError(404, 'VIDEO_NOT_FOUND', 'Video not found');
      return listReplies(
        app,
        parent.id,
        request.query.cursor,
        request.query.limit,
        request.user?.id ?? null,
      );
    },
  );

  app.delete(
    '/:id',
    {
      schema: {
        description: 'Soft delete a comment (author, video owner or admin)',
        params: commentIdParamSchema,
        response: {
          200: messageResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
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
      const viewer = request.user;
      if (!viewer) throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required');
      const [row] = await app.db
        .select({
          id: comments.id,
          userId: comments.userId,
          videoId: comments.videoId,
          parentId: comments.parentId,
          deletedAt: comments.deletedAt,
          ownerId: videos.ownerId,
        })
        .from(comments)
        .innerJoin(videos, eq(videos.id, comments.videoId))
        .where(eq(comments.id, request.params.id))
        .limit(1);
      if (!row) throw badRequest('COMMENT_NOT_FOUND', 'Comment not found');
      if (row.userId !== viewer.id && row.ownerId !== viewer.id && viewer.role !== 'admin') {
        throw forbidden('FORBIDDEN', 'You cannot delete this comment');
      }
      if (!row.deletedAt) {
        await app.db.transaction(async (tx) => {
          await tx.update(comments).set({ deletedAt: new Date() }).where(eq(comments.id, row.id));
          await tx
            .update(videos)
            .set({ commentsCount: sql`greatest(${videos.commentsCount} - 1, 0)` })
            .where(eq(videos.id, row.videoId));
          if (row.parentId) {
            await tx
              .update(comments)
              .set({ replyCount: sql`greatest(${comments.replyCount} - 1, 0)` })
              .where(eq(comments.id, row.parentId));
          }
        });
      }
      return { message: 'Comment deleted' };
    },
  );

  app.post(
    '/:id/like',
    {
      schema: {
        description: 'Like a comment (idempotent)',
        params: commentIdParamSchema,
        response: {
          200: commentLikeResponseSchema,
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
      const row = await findCommentForInteraction(app, request);
      const result = await app.db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(commentLikes)
          .values({ userId, commentId: row.id })
          .onConflictDoNothing()
          .returning({ id: commentLikes.id });
        if (!inserted) {
          const [current] = await tx
            .select({ likesCount: comments.likesCount })
            .from(comments)
            .where(eq(comments.id, row.id))
            .limit(1);
          return { changed: false, likesCount: current?.likesCount ?? 0 };
        }
        const [updated] = await tx
          .update(comments)
          .set({ likesCount: sql`${comments.likesCount} + 1` })
          .where(eq(comments.id, row.id))
          .returning({ likesCount: comments.likesCount });
        return { changed: true, likesCount: updated?.likesCount ?? 0 };
      });
      if (result.changed) {
        app.events.emit('comment.liked', {
          commentId: row.id,
          actorId: userId,
          ownerId: row.userId,
        });
      }
      return { commentId: row.id, liked: true, likesCount: result.likesCount };
    },
  );

  app.delete(
    '/:id/like',
    {
      schema: {
        description: 'Remove a comment like (idempotent)',
        params: commentIdParamSchema,
        response: {
          200: commentLikeResponseSchema,
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
      const row = await findCommentForInteraction(app, request);
      const likesCount = await app.db.transaction(async (tx) => {
        const [deleted] = await tx
          .delete(commentLikes)
          .where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, row.id)))
          .returning({ id: commentLikes.id });
        if (!deleted) {
          const [current] = await tx
            .select({ likesCount: comments.likesCount })
            .from(comments)
            .where(eq(comments.id, row.id))
            .limit(1);
          return current?.likesCount ?? 0;
        }
        const [updated] = await tx
          .update(comments)
          .set({ likesCount: sql`greatest(${comments.likesCount} - 1, 0)` })
          .where(eq(comments.id, row.id))
          .returning({ likesCount: comments.likesCount });
        return updated?.likesCount ?? 0;
      });
      return { commentId: row.id, liked: false, likesCount };
    },
  );
};

async function findCommentForInteraction(
  app: Parameters<FastifyPluginAsyncZod>[0],
  request: FastifyRequest<{ Params: { id: string } }>,
): Promise<{ id: string; userId: string }> {
  const [row] = await app.db
    .select({
      id: comments.id,
      userId: comments.userId,
      videoId: comments.videoId,
      deletedAt: comments.deletedAt,
    })
    .from(comments)
    .where(eq(comments.id, request.params.id))
    .limit(1);
  if (!row || row.deletedAt) throw badRequest('COMMENT_NOT_FOUND', 'Comment not found');
  const video = await findInteractableVideo(app, row.videoId, request.user);
  if (!video) throw new AppError(404, 'VIDEO_NOT_FOUND', 'Video not found');
  return { id: row.id, userId: row.userId };
}
