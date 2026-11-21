import { randomUUID } from 'node:crypto';
import { and, desc, eq, exists, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  avatarConfirmRequestSchema,
  avatarConfirmResponseSchema,
  avatarUploadRequestSchema,
  avatarUploadUrlResponseSchema,
  errorResponseSchema,
  feedResponseSchema,
  followListResponseSchema,
  followResponseSchema,
  meResponseSchema,
  publicProfileResponseSchema,
  socialListQuerySchema,
  updateProfileRequestSchema,
  usernameParamSchema,
  videoListQuerySchema,
  videoListResponseSchema,
} from '@reel/shared';
import type { FollowListItem } from '@reel/shared';
import { follows, likes, saves, users, videos } from '../../db/schema.js';
import { AppError, badRequest, conflict } from '../../lib/errors.js';
import { avatarUrl, toMeUser, toPublicUser } from '../../lib/users.js';
import { listVideos } from '../videos/plugin.js';
import { publicFeedVisibility } from '../../lib/visibility.js';
import { decodeCursor, encodeCursor } from '../../lib/cursor.js';
import { listFeedVideos } from '../../feed/queries.js';
import { interactionRateLimitKey } from '../../lib/rate-limit-key.js';

const AVATAR_URL_TTL_SECONDS = 15 * 60;

interface FollowUserRow {
  followId: string;
  followedAt: Date;
  userId: string;
  username: string;
  displayName: string;
  avatarKey: string | null;
}

async function listFollowUsers(
  app: Parameters<FastifyPluginAsyncZod>[0],
  targetId: string,
  direction: 'followers' | 'following',
  cursor: string | undefined,
  limit: number,
  viewerId: string | null,
): Promise<{ items: FollowListItem[]; nextCursor: string | null }> {
  const decoded = cursor ? decodeCursor(cursor) : null;
  let cursorCondition;
  if (decoded) {
    const followedAt = new Date(decoded.keyParts[0] ?? '');
    if (Number.isNaN(followedAt.getTime())) {
      throw badRequest('VALIDATION_ERROR', 'Invalid cursor');
    }
    cursorCondition = or(
      lt(follows.createdAt, followedAt),
      and(eq(follows.createdAt, followedAt), lt(follows.id, decoded.id)),
    );
  }

  const matchColumn = direction === 'followers' ? follows.followingId : follows.followerId;
  const userColumn = direction === 'followers' ? follows.followerId : follows.followingId;
  const rows = await app.db
    .select({
      followId: follows.id,
      followedAt: follows.createdAt,
      userId: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarKey: users.avatarKey,
    })
    .from(follows)
    .innerJoin(users, eq(users.id, userColumn))
    .where(and(eq(matchColumn, targetId), cursorCondition))
    .orderBy(desc(follows.createdAt), desc(follows.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit) as FollowUserRow[];
  const followed = new Set<string>();
  if (viewerId && page.length > 0) {
    const ids = page.map((row) => row.userId);
    const followedRows = await app.db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(and(eq(follows.followerId, viewerId), inArray(follows.followingId, ids)));
    for (const row of followedRows) followed.add(row.followingId);
  }

  const last = page.at(-1);
  return {
    items: page.map((row) => ({
      user: {
        id: row.userId,
        username: row.username,
        displayName: row.displayName,
        avatarUrl: avatarUrl(app, row.avatarKey),
      },
      viewerState: { following: followed.has(row.userId) },
    })),
    nextCursor:
      rows.length > limit && last
        ? encodeCursor([last.followedAt.toISOString()], last.followId)
        : null,
  };
}

function databaseErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

export const usersPlugin: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/:username',
    {
      schema: {
        description: 'Get a public user profile',
        params: usernameParamSchema,
        response: { 200: publicProfileResponseSchema, 404: errorResponseSchema },
      },
      preHandler: app.optionalAuth,
    },
    async (request, reply) => {
      const username = request.params.username.toLowerCase();
      const [user] = await app.db
        .select()
        .from(users)
        .where(sql`lower(${users.username}) = ${username}`)
        .limit(1);
      if (!user) throw badRequest('USER_NOT_FOUND', 'User not found');
      const [videoCount] = await app.db
        .select({ value: sql<number>`count(*)::int` })
        .from(videos)
        .where(
          and(
            eq(videos.ownerId, user.id),
            eq(videos.status, 'ready'),
            eq(videos.visibility, 'public'),
            isNull(videos.deletedAt),
          ),
        );
      const viewerId = request.user?.id ?? null;
      const following =
        viewerId && viewerId !== user.id
          ? (
              await app.db
                .select({ id: follows.id })
                .from(follows)
                .where(and(eq(follows.followerId, viewerId), eq(follows.followingId, user.id)))
                .limit(1)
            ).length > 0
          : false;
      return reply.send({
        user: toPublicUser(app, user, videoCount?.value ?? 0),
        viewerState: { following },
      });
    },
  );

  app.get(
    '/me/videos',
    {
      schema: {
        description: 'List the current user videos, newest first',
        querystring: videoListQuerySchema,
        response: {
          200: videoListResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: app.authenticate,
    },
    async (request) => {
      return listVideos(app, request.user?.id ?? '', request.query.cursor, request.query.limit);
    },
  );

  app.patch(
    '/me',
    {
      schema: {
        description: 'Update the current user profile',
        body: updateProfileRequestSchema,
        response: {
          200: meResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
      preHandler: app.authenticate,
    },
    async (request) => {
      const userId = request.user?.id ?? '';
      const input = request.body;
      if (input.username) {
        const [existing] = await app.db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              sql`lower(${users.username}) = ${input.username.toLowerCase()}`,
              ne(users.id, userId),
            ),
          )
          .limit(1);
        if (existing) throw conflict('AUTH_DUPLICATE_USERNAME', 'Username is already taken');
      }

      try {
        const [updated] = await app.db
          .update(users)
          .set({
            ...(input.username ? { username: input.username } : {}),
            ...(input.displayName ? { displayName: input.displayName } : {}),
            ...(input.bio !== undefined ? { bio: input.bio } : {}),
          })
          .where(eq(users.id, userId))
          .returning();
        if (!updated) throw badRequest('USER_NOT_FOUND', 'User not found');
        return { user: toMeUser(app, updated) };
      } catch (error) {
        if (databaseErrorCode(error) === '23505') {
          throw conflict('AUTH_DUPLICATE_USERNAME', 'Username is already taken');
        }
        throw error;
      }
    },
  );

  app.post(
    '/me/avatar-url',
    {
      schema: {
        description: 'Create a presigned URL for an avatar upload',
        body: avatarUploadRequestSchema,
        response: { 200: avatarUploadUrlResponseSchema, 401: errorResponseSchema },
      },
      preHandler: app.authenticate,
    },
    async (request) => {
      const userId = request.user?.id ?? '';
      const key = `avatars/${userId}/${randomUUID()}`;
      const publicUrl = avatarUrl(app, key);
      if (!publicUrl) throw new AppError(500, 'INTERNAL_ERROR', 'Could not build avatar URL');
      const uploadUrl = await app.s3.presignedPutObject(
        app.config.S3_BUCKET,
        key,
        AVATAR_URL_TTL_SECONDS,
      );
      return { uploadUrl, key, publicUrl, expiresIn: AVATAR_URL_TTL_SECONDS };
    },
  );

  app.post(
    '/me/avatar',
    {
      schema: {
        description: 'Confirm and activate an uploaded avatar',
        body: avatarConfirmRequestSchema,
        response: {
          200: avatarConfirmResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
      preHandler: app.authenticate,
    },
    async (request) => {
      const userId = request.user?.id ?? '';
      const { key, contentType, size } = request.body;
      if (!key.startsWith(`avatars/${userId}/`)) {
        throw badRequest('AVATAR_INVALID_FILE', 'Avatar key does not belong to this user');
      }

      let stat;
      try {
        stat = await app.s3.statObject(app.config.S3_BUCKET, key);
      } catch {
        throw badRequest('AVATAR_UPLOAD_NOT_FOUND', 'Uploaded avatar was not found');
      }
      const storedType = String(
        stat.metaData['content-type'] ?? stat.metaData['Content-Type'] ?? '',
      );
      if (storedType !== contentType || stat.size !== size) {
        await app.s3.removeObject(app.config.S3_BUCKET, key);
        throw badRequest('AVATAR_INVALID_FILE', 'Uploaded avatar does not match the request');
      }

      const [current] = await app.db
        .select({ avatarKey: users.avatarKey })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      const [updated] = await app.db
        .update(users)
        .set({ avatarKey: key })
        .where(eq(users.id, userId))
        .returning();
      if (!updated) throw badRequest('USER_NOT_FOUND', 'User not found');
      if (current?.avatarKey && current.avatarKey !== key) {
        await app.s3.removeObject(app.config.S3_BUCKET, current.avatarKey);
      }
      return { user: toMeUser(app, updated) };
    },
  );

  app.get(
    '/me/saved',
    {
      schema: {
        description: 'Videos saved by the current user',
        querystring: socialListQuerySchema,
        response: { 200: feedResponseSchema, 401: errorResponseSchema },
      },
      preHandler: app.authenticate,
    },
    async (request) => {
      const viewerId = request.user?.id ?? '';
      return listFeedVideos(
        app,
        and(
          publicFeedVisibility(),
          exists(
            app.db
              .select({ one: sql`1` })
              .from(saves)
              .where(and(eq(saves.userId, viewerId), eq(saves.videoId, videos.id))),
          ),
        ),
        request.query.cursor,
        request.query.limit,
        viewerId,
      );
    },
  );

  app.get(
    '/me/liked',
    {
      schema: {
        description: 'Videos liked by the current user',
        querystring: socialListQuerySchema,
        response: { 200: feedResponseSchema, 401: errorResponseSchema },
      },
      preHandler: app.authenticate,
    },
    async (request) => {
      const viewerId = request.user?.id ?? '';
      return listFeedVideos(
        app,
        and(
          publicFeedVisibility(),
          exists(
            app.db
              .select({ one: sql`1` })
              .from(likes)
              .where(and(eq(likes.userId, viewerId), eq(likes.videoId, videos.id))),
          ),
        ),
        request.query.cursor,
        request.query.limit,
        viewerId,
      );
    },
  );

  app.get(
    '/:username/videos',
    {
      schema: {
        description: 'Public ready videos for a profile',
        params: usernameParamSchema,
        querystring: socialListQuerySchema,
        response: { 200: feedResponseSchema, 404: errorResponseSchema },
      },
      preHandler: app.optionalAuth,
    },
    async (request) => {
      const username = request.params.username.toLowerCase();
      const [user] = await app.db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.username}) = ${username}`)
        .limit(1);
      if (!user) throw badRequest('USER_NOT_FOUND', 'User not found');
      return listFeedVideos(
        app,
        and(publicFeedVisibility(), eq(videos.ownerId, user.id)),
        request.query.cursor,
        request.query.limit,
        request.user?.id ?? null,
      );
    },
  );

  app.get(
    '/:username/followers',
    {
      schema: {
        description: 'Followers of a user, newest first',
        params: usernameParamSchema,
        querystring: socialListQuerySchema,
        response: { 200: followListResponseSchema, 404: errorResponseSchema },
      },
      preHandler: app.optionalAuth,
    },
    async (request) => {
      const username = request.params.username.toLowerCase();
      const [user] = await app.db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.username}) = ${username}`)
        .limit(1);
      if (!user) throw badRequest('USER_NOT_FOUND', 'User not found');
      return listFollowUsers(
        app,
        user.id,
        'followers',
        request.query.cursor,
        request.query.limit,
        request.user?.id ?? null,
      );
    },
  );

  app.get(
    '/:username/following',
    {
      schema: {
        description: 'Users followed by a user, newest first',
        params: usernameParamSchema,
        querystring: socialListQuerySchema,
        response: { 200: followListResponseSchema, 404: errorResponseSchema },
      },
      preHandler: app.optionalAuth,
    },
    async (request) => {
      const username = request.params.username.toLowerCase();
      const [user] = await app.db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.username}) = ${username}`)
        .limit(1);
      if (!user) throw badRequest('USER_NOT_FOUND', 'User not found');
      return listFollowUsers(
        app,
        user.id,
        'following',
        request.query.cursor,
        request.query.limit,
        request.user?.id ?? null,
      );
    },
  );

  app.post(
    '/:username/follow',
    {
      schema: {
        description: 'Follow a user (idempotent)',
        params: usernameParamSchema,
        response: {
          200: followResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: app.requireVerified,
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
          keyGenerator: interactionRateLimitKey,
        },
      },
    },
    async (request) => {
      const followerId = request.user?.id ?? '';
      const username = request.params.username.toLowerCase();
      const [target] = await app.db
        .select({ id: users.id, username: users.username, status: users.status })
        .from(users)
        .where(sql`lower(${users.username}) = ${username}`)
        .limit(1);
      if (!target || target.status !== 'active') {
        throw badRequest('USER_NOT_FOUND', 'User not found');
      }
      if (target.id === followerId) {
        throw badRequest('VALIDATION_ERROR', 'You cannot follow yourself');
      }

      const result = await app.db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(follows)
          .values({ followerId, followingId: target.id })
          .onConflictDoNothing()
          .returning({ id: follows.id });
        if (inserted) {
          await tx
            .update(users)
            .set({ followersCount: sql`${users.followersCount} + 1` })
            .where(eq(users.id, target.id));
          await tx
            .update(users)
            .set({ followingCount: sql`${users.followingCount} + 1` })
            .where(eq(users.id, followerId));
        }
        const [followingUser] = await tx
          .select({ followersCount: users.followersCount })
          .from(users)
          .where(eq(users.id, target.id))
          .limit(1);
        const [viewer] = await tx
          .select({ followingCount: users.followingCount })
          .from(users)
          .where(eq(users.id, followerId))
          .limit(1);
        return {
          changed: Boolean(inserted),
          followersCount: followingUser?.followersCount ?? 0,
          followingCount: viewer?.followingCount ?? 0,
        };
      });

      if (result.changed) {
        app.events.emit('user.followed', { followerId, followingId: target.id });
      }
      return {
        username: target.username,
        following: true,
        followersCount: result.followersCount,
        followingCount: result.followingCount,
      };
    },
  );

  app.delete(
    '/:username/follow',
    {
      schema: {
        description: 'Unfollow a user (idempotent)',
        params: usernameParamSchema,
        response: {
          200: followResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
      preHandler: app.requireVerified,
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
          keyGenerator: interactionRateLimitKey,
        },
      },
    },
    async (request) => {
      const followerId = request.user?.id ?? '';
      const username = request.params.username.toLowerCase();
      const [target] = await app.db
        .select({ id: users.id, username: users.username, status: users.status })
        .from(users)
        .where(sql`lower(${users.username}) = ${username}`)
        .limit(1);
      if (!target || target.status !== 'active') {
        throw badRequest('USER_NOT_FOUND', 'User not found');
      }

      const result = await app.db.transaction(async (tx) => {
        const [deleted] = await tx
          .delete(follows)
          .where(and(eq(follows.followerId, followerId), eq(follows.followingId, target.id)))
          .returning({ id: follows.id });
        if (deleted) {
          await tx
            .update(users)
            .set({
              followersCount: sql`greatest(${users.followersCount} - 1, 0)`,
            })
            .where(eq(users.id, target.id));
          await tx
            .update(users)
            .set({
              followingCount: sql`greatest(${users.followingCount} - 1, 0)`,
            })
            .where(eq(users.id, followerId));
        }
        const [followingUser] = await tx
          .select({ followersCount: users.followersCount })
          .from(users)
          .where(eq(users.id, target.id))
          .limit(1);
        const [viewer] = await tx
          .select({ followingCount: users.followingCount })
          .from(users)
          .where(eq(users.id, followerId))
          .limit(1);
        return {
          followersCount: followingUser?.followersCount ?? 0,
          followingCount: viewer?.followingCount ?? 0,
        };
      });

      return {
        username: target.username,
        following: false,
        followersCount: result.followersCount,
        followingCount: result.followingCount,
      };
    },
  );
};
