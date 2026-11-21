import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  commentListQuerySchema,
  commentListResponseSchema,
  commentResponseSchema,
  createCommentRequestSchema,
  createVideoUploadRequestSchema,
  createVideoUploadResponseSchema,
  errorResponseSchema,
  messageResponseSchema,
  parseHashtags,
  updateVideoRequestSchema,
  videoContentTypeSchema,
  videoIdParamSchema,
  videoResponseSchema,
  videoStatusResponseSchema,
} from '@reel/shared';
import type { Video } from '@reel/shared';
import { comments, hashtags, users, videoHashtags, videos } from '../../db/schema.js';
import type { Database } from '../../db/client.js';
import { AppError, badRequest, forbidden } from '../../lib/errors.js';
import { enqueueVideoCleanup, enqueueVideoProcessing } from '../../lib/video-jobs.js';
import { videoLimits } from '../../lib/video-limits.js';
import { decodeVideoCursor, encodeVideoCursor, toVideo } from '../../lib/videos.js';
import { assertTransition } from '../../lib/video-status.js';
import { originalKey } from '../../lib/storage-keys.js';
import { enforceUploadQuota } from '../../lib/upload-quota.js';
import { findInteractableVideo } from '../../lib/video-access.js';
import { interactionRateLimitKey } from '../../lib/rate-limit-key.js';
import { directVideoVisibility } from '../../lib/visibility.js';
import { listTopLevelComments } from '../comments/queries.js';
import { loadCommentById } from '../comments/data.js';

async function hashtagNamesFor(db: Database, videoId: string): Promise<string[]> {
  const rows = await db
    .select({ name: hashtags.name })
    .from(videoHashtags)
    .innerJoin(hashtags, eq(hashtags.id, videoHashtags.hashtagId))
    .where(eq(videoHashtags.videoId, videoId));
  return rows.map((row) => row.name);
}

export async function listVideos(
  app: Parameters<FastifyPluginAsyncZod>[0],
  ownerId: string,
  cursor: string | undefined,
  limit: number,
): Promise<{ items: Video[]; nextCursor: string | null }> {
  const decoded = cursor ? decodeVideoCursor(cursor) : null;
  const rows = await app.db
    .select()
    .from(videos)
    .where(
      and(
        eq(videos.ownerId, ownerId),
        isNull(videos.deletedAt),
        decoded
          ? or(
              lt(videos.createdAt, decoded.createdAt),
              and(eq(videos.createdAt, decoded.createdAt), lt(videos.id, decoded.id)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(videos.createdAt), desc(videos.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const tagsByVideo = new Map<string, string[]>();
  if (page.length > 0) {
    const tagRows = await app.db
      .select({ videoId: videoHashtags.videoId, name: hashtags.name })
      .from(videoHashtags)
      .innerJoin(hashtags, eq(hashtags.id, videoHashtags.hashtagId))
      .where(
        inArray(
          videoHashtags.videoId,
          page.map((row) => row.id),
        ),
      );
    for (const tag of tagRows) {
      const current = tagsByVideo.get(tag.videoId) ?? [];
      current.push(tag.name);
      tagsByVideo.set(tag.videoId, current);
    }
  }

  return {
    items: page.map((row) => toVideo(app, row, tagsByVideo.get(row.id) ?? [])),
    nextCursor: rows.length > limit && last ? encodeVideoCursor(last) : null,
  };
}

export const videosPlugin: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/uploads',
    {
      schema: {
        description: 'Create a video row and a presigned POST upload target',
        body: createVideoUploadRequestSchema,
        response: {
          201: createVideoUploadResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          409: errorResponseSchema,
          429: errorResponseSchema,
        },
      },
      preHandler: app.requireVerified,
    },
    async (request, reply) => {
      const userId = request.user?.id ?? '';
      const limits = videoLimits(app);
      if (request.body.sizeBytes > limits.maxBytes) {
        throw badRequest(
          'VIDEO_TOO_LARGE',
          `Video must be ${app.config.MAX_VIDEO_MB} MB or smaller`,
        );
      }
      await enforceUploadQuota(app, userId);

      const videoId = randomUUID();
      const upload = await app.videoProvider.createUpload({
        videoId,
        contentType: request.body.contentType,
        maxBytes: limits.maxBytes,
      });
      await app.db.insert(videos).values({
        id: videoId,
        ownerId: userId,
        caption: request.body.caption?.trim() ?? '',
        visibility: request.body.visibility,
        status: 'uploading',
        originalKey: originalKey(videoId),
      });
      return reply.code(201).send({
        videoId,
        upload: { url: upload.url, fields: upload.fields },
        expiresIn: upload.expiresIn,
      });
    },
  );

  app.post(
    '/:id/complete',
    {
      schema: {
        description: 'Verify an uploaded object and enqueue processing',
        params: videoIdParamSchema,
        response: {
          200: videoResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: app.requireVerified,
    },
    async (request) => {
      const userId = request.user?.id ?? '';
      const [row] = await app.db
        .select()
        .from(videos)
        .where(and(eq(videos.id, request.params.id), isNull(videos.deletedAt)))
        .limit(1);
      if (!row || row.ownerId !== userId) {
        throw new AppError(404, 'VIDEO_NOT_FOUND', 'Video not found');
      }

      if (row.status === 'uploading') {
        const finalized = await app.videoProvider.finalizeUpload(row.id);
        if (!finalized) {
          throw badRequest('VIDEO_UPLOAD_NOT_FOUND', 'Uploaded file was not found');
        }
        const limits = videoLimits(app);
        const contentValid = videoContentTypeSchema.safeParse(finalized.contentType);
        if (!contentValid.success) {
          await app.s3.removeObject(app.config.S3_BUCKET, finalized.key);
          throw badRequest('VIDEO_INVALID_TYPE', 'Unsupported video format');
        }
        if (finalized.size <= 0 || finalized.size > limits.maxBytes) {
          await app.s3.removeObject(app.config.S3_BUCKET, finalized.key);
          throw badRequest(
            'VIDEO_TOO_LARGE',
            `Video must be ${app.config.MAX_VIDEO_MB} MB or smaller`,
          );
        }

        assertTransition('uploading', 'processing');
        const [updated] = await app.db
          .update(videos)
          .set({
            status: 'processing',
            processingStartedAt: new Date(),
            failureCode: null,
            failureMessage: null,
          })
          .where(and(eq(videos.id, row.id), eq(videos.status, 'uploading')))
          .returning();
        if (updated) {
          await enqueueVideoProcessing(app.queues.videoProcessing, row.id);
        }
      }

      const [current] = await app.db.select().from(videos).where(eq(videos.id, row.id)).limit(1);
      if (!current) throw new AppError(404, 'VIDEO_NOT_FOUND', 'Video not found');
      return { video: toVideo(app, current, await hashtagNamesFor(app.db, current.id)) };
    },
  );

  app.get(
    '/:id',
    {
      schema: {
        description: 'Get a video and its playback URLs when ready',
        params: videoIdParamSchema,
        response: {
          200: videoResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: app.optionalAuth,
    },
    async (request) => {
      const [result] = await app.db
        .select({ video: videos, authorStatus: users.status })
        .from(videos)
        .innerJoin(users, eq(users.id, videos.ownerId))
        .where(and(eq(videos.id, request.params.id), directVideoVisibility(request.user)))
        .limit(1);
      if (!result) throw new AppError(404, 'VIDEO_NOT_FOUND', 'Video not found');
      const row = result.video;
      return { video: toVideo(app, row, await hashtagNamesFor(app.db, row.id)) };
    },
  );

  app.get(
    '/:id/status',
    {
      schema: {
        description: 'Poll processing status and progress',
        params: videoIdParamSchema,
        response: {
          200: videoStatusResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: app.optionalAuth,
    },
    async (request) => {
      const [row] = await app.db
        .select()
        .from(videos)
        .where(and(eq(videos.id, request.params.id), isNull(videos.deletedAt)))
        .limit(1);
      if (!row) throw new AppError(404, 'VIDEO_NOT_FOUND', 'Video not found');
      if (row.ownerId !== request.user?.id && request.user?.role !== 'admin') {
        throw new AppError(404, 'VIDEO_NOT_FOUND', 'Video not found');
      }
      const stored =
        row.status === 'processing' ? await app.redis.get(`reel:video-progress:${row.id}`) : null;
      const progress =
        row.status === 'ready' ? 100 : stored ? Math.min(99, Math.max(0, Number(stored) || 0)) : 0;
      return {
        id: row.id,
        status: row.status,
        progress,
        failure: toVideo(app, row).failure,
      };
    },
  );

  app.patch(
    '/:id',
    {
      schema: {
        description: 'Update a video caption or visibility and sync hashtags',
        params: videoIdParamSchema,
        body: updateVideoRequestSchema,
        response: {
          200: videoResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: app.authenticate,
    },
    async (request) => {
      const userId = request.user?.id ?? '';
      const [row] = await app.db
        .select()
        .from(videos)
        .where(and(eq(videos.id, request.params.id), isNull(videos.deletedAt)))
        .limit(1);
      if (!row) throw new AppError(404, 'VIDEO_NOT_FOUND', 'Video not found');
      if (row.ownerId !== userId) throw forbidden('FORBIDDEN', 'You do not own this video');

      const caption = request.body.caption?.trim();
      const updated = await app.db.transaction(async (tx) => {
        const [next] = await tx
          .update(videos)
          .set({
            ...(caption !== undefined ? { caption } : {}),
            ...(request.body.visibility ? { visibility: request.body.visibility } : {}),
          })
          .where(eq(videos.id, row.id))
          .returning();
        if (!next) throw new AppError(404, 'VIDEO_NOT_FOUND', 'Video not found');

        if (caption !== undefined) {
          await tx.delete(videoHashtags).where(eq(videoHashtags.videoId, row.id));
          const names = parseHashtags(caption);
          if (names.length > 0) {
            await tx
              .insert(hashtags)
              .values(names.map((name) => ({ name })))
              .onConflictDoNothing({ target: hashtags.name });
            const tagRows = await tx
              .select({ id: hashtags.id })
              .from(hashtags)
              .where(inArray(hashtags.name, names));
            if (tagRows.length > 0) {
              await tx
                .insert(videoHashtags)
                .values(tagRows.map((tag) => ({ videoId: row.id, hashtagId: tag.id })))
                .onConflictDoNothing();
            }
          }
        }
        return next;
      });

      return { video: toVideo(app, updated, await hashtagNamesFor(app.db, row.id)) };
    },
  );

  app.delete(
    '/:id',
    {
      schema: {
        description: 'Soft delete a video and remove its storage objects',
        params: videoIdParamSchema,
        response: {
          200: messageResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: app.authenticate,
    },
    async (request) => {
      const [row] = await app.db
        .select()
        .from(videos)
        .where(and(eq(videos.id, request.params.id), isNull(videos.deletedAt)))
        .limit(1);
      if (!row) throw new AppError(404, 'VIDEO_NOT_FOUND', 'Video not found');
      const userId = request.user?.id ?? '';
      if (row.ownerId !== userId && request.user?.role !== 'admin') {
        throw forbidden('FORBIDDEN', 'You cannot delete this video');
      }
      if (!row.deletedAt) {
        await app.db.update(videos).set({ deletedAt: new Date() }).where(eq(videos.id, row.id));
        await enqueueVideoCleanup(app.queues.videoCleanup, row.id);
      }
      return { message: 'Video deleted' };
    },
  );

  app.get(
    '/:id/comments',
    {
      schema: {
        description: 'List top-level comments for a video',
        params: videoIdParamSchema,
        querystring: commentListQuerySchema,
        response: {
          200: commentListResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: app.optionalAuth,
    },
    async (request) => {
      const video = await findInteractableVideo(app, request.params.id, request.user);
      if (!video) throw new AppError(404, 'VIDEO_NOT_FOUND', 'Video not found');
      return listTopLevelComments(
        app,
        video.id,
        request.query.sort,
        request.query.cursor,
        request.query.limit,
        request.user?.id ?? null,
      );
    },
  );

  app.post(
    '/:id/comments',
    {
      schema: {
        description: 'Add a top-level comment or a one-level reply',
        params: videoIdParamSchema,
        body: createCommentRequestSchema,
        response: {
          201: commentResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
          429: errorResponseSchema,
        },
      },
      preHandler: app.requireVerified,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
          keyGenerator: interactionRateLimitKey,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user?.id ?? '';
      const video = await findInteractableVideo(app, request.params.id, request.user);
      if (!video) throw new AppError(404, 'VIDEO_NOT_FOUND', 'Video not found');

      let parentId: string | null = null;
      let replyToUserId: string | null = null;
      let parentUserId: string | null = null;
      if (request.body.parentId) {
        const [parent] = await app.db
          .select({
            id: comments.id,
            videoId: comments.videoId,
            userId: comments.userId,
            parentId: comments.parentId,
            deletedAt: comments.deletedAt,
          })
          .from(comments)
          .where(eq(comments.id, request.body.parentId))
          .limit(1);
        if (!parent || parent.videoId !== video.id || parent.deletedAt) {
          throw badRequest('COMMENT_NOT_FOUND', 'Comment not found');
        }
        parentId = parent.parentId ?? parent.id;
        replyToUserId = parent.userId;
        parentUserId = parent.userId;
      }

      const comment = await app.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(comments)
          .values({
            videoId: video.id,
            userId,
            parentId,
            body: request.body.text,
            replyToUserId,
          })
          .returning({ id: comments.id });
        if (!created) throw new AppError(500, 'INTERNAL_ERROR', 'Could not create comment');
        if (parentId) {
          await tx
            .update(comments)
            .set({ replyCount: sql`${comments.replyCount} + 1` })
            .where(eq(comments.id, parentId));
        }
        await tx
          .update(videos)
          .set({ commentsCount: sql`${videos.commentsCount} + 1` })
          .where(eq(videos.id, video.id));
        return created;
      });

      app.events.emit('video.commented', {
        videoId: video.id,
        commentId: comment.id,
        actorId: userId,
        ownerId: video.ownerId,
        parentId,
      });
      if (parentId && parentUserId) {
        app.events.emit('comment.replied', {
          videoId: video.id,
          commentId: comment.id,
          parentCommentId: parentId,
          actorId: userId,
          recipientId: parentUserId,
        });
      }

      const loaded = await loadCommentById(app, comment.id, userId);
      if (!loaded) throw new AppError(500, 'INTERNAL_ERROR', 'Could not load comment');
      return reply.code(201).send({ comment: loaded });
    },
  );
};
