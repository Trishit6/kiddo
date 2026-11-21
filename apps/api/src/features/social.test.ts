import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import type { CommentListResponse, FeedResponse } from '@reel/shared';
import { buildApp } from '../app.js';
import { comments, follows, likes, saves, users, videoViews, videos } from '../db/schema.js';
import { cleanUsers, expectStatus, mobileRequest } from '../test/helpers.js';
import { authHeaders, createUser, createVideo, getJson, postJson } from '../test/social-helpers.js';
import { recomputeHotScores, reconcileCounters } from '../worker/social-jobs.js';

function feedIds(feed: FeedResponse): string[] {
  return feed.items.map((item) => item.video.id);
}

async function followDirect(
  app: ReturnType<typeof buildApp>,
  followerId: string,
  followingId: string,
) {
  await app.db.insert(follows).values({ followerId, followingId }).onConflictDoNothing();
}

describe('feeds, interactions and comments', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanUsers(app);
    await app.redis.flushdb();
  });

  it('never leaks hidden videos through feeds, lists or profiles', async () => {
    const viewer = await createUser(app, 'visibilityviewer');
    const author = await createUser(app, 'visibilityauthor');
    const banned = await createUser(app, 'bannedauthor');
    await app.db.update(users).set({ status: 'banned' }).where(eq(users.id, banned.id));

    const publicId = await createVideo(app, { ownerId: author.id, tag: 'hidden' });
    const privateId = await createVideo(app, {
      ownerId: author.id,
      visibility: 'private',
      tag: 'hidden',
    });
    const unlistedId = await createVideo(app, {
      ownerId: author.id,
      visibility: 'unlisted',
      tag: 'hidden',
    });
    const processingId = await createVideo(app, {
      ownerId: author.id,
      status: 'processing',
      tag: 'hidden',
    });
    const failedId = await createVideo(app, {
      ownerId: author.id,
      status: 'failed',
      tag: 'hidden',
    });
    const deletedId = await createVideo(app, {
      ownerId: author.id,
      deletedAt: new Date(),
      tag: 'hidden',
    });
    const bannedId = await createVideo(app, { ownerId: banned.id, tag: 'hidden' });
    const ownId = await createVideo(app, { ownerId: viewer.id, tag: 'hidden' });

    const allIds = [
      publicId,
      privateId,
      unlistedId,
      processingId,
      failedId,
      deletedId,
      bannedId,
      ownId,
    ];
    for (const videoId of allIds) {
      await app.db.insert(likes).values({ userId: viewer.id, videoId }).onConflictDoNothing();
      await app.db.insert(saves).values({ userId: viewer.id, videoId }).onConflictDoNothing();
    }
    await followDirect(app, viewer.id, author.id);
    await followDirect(app, viewer.id, banned.id);

    const feed = await getJson<FeedResponse>(app, '/feed/for-you?limit=30', {
      token: viewer.token,
    });
    expect(feedIds(feed)).toEqual([publicId]);

    const following = await getJson<FeedResponse>(app, '/feed/following?limit=30', {
      token: viewer.token,
    });
    expect(feedIds(following)).toEqual([publicId]);

    const profile = await getJson<FeedResponse>(app, `/users/${author.username}/videos`, {
      token: viewer.token,
    });
    expect(feedIds(profile)).toEqual([publicId]);

    const hashtag = await getJson<FeedResponse>(app, '/hashtags/hidden/videos', {
      token: viewer.token,
    });
    expect(new Set(feedIds(hashtag))).toEqual(new Set([publicId, ownId]));

    for (const url of ['/users/me/saved?limit=30', '/users/me/liked?limit=30']) {
      const list = await getJson<FeedResponse>(app, url, { token: viewer.token });
      expect(new Set(feedIds(list))).toEqual(new Set([publicId, ownId]));
    }

    const trending = await getJson<{
      videos: Array<{ video: { id: string }; viewerState: { liked: boolean } }>;
    }>(app, '/explore/trending', { token: viewer.token });
    expect(new Set(trending.videos.map((item) => item.video.id))).toEqual(
      new Set([publicId, ownId]),
    );
    expect(trending.videos.find((item) => item.video.id === publicId)?.viewerState.liked).toBe(
      true,
    );

    // The trending cache must not leak one viewer's state to another.
    const otherViewer = await createUser(app, 'trendingother');
    const trendingOther = await getJson<{
      videos: Array<{ video: { id: string }; viewerState: { liked: boolean } }>;
    }>(app, '/explore/trending', { token: otherViewer.token });
    expect(trendingOther.videos.find((item) => item.video.id === publicId)?.viewerState.liked).toBe(
      false,
    );

    const privateOther = await mobileRequest(app, {
      method: 'GET',
      url: `/videos/${privateId}`,
      headers: authHeaders(viewer.token),
    });
    expect(privateOther.statusCode).toBe(404);
    const privateOwner = await mobileRequest(app, {
      method: 'GET',
      url: `/videos/${privateId}`,
      headers: authHeaders(author.token),
    });
    expect(privateOwner.statusCode).toBe(200);
    const unlistedPublic = await mobileRequest(app, {
      method: 'GET',
      url: `/videos/${unlistedId}`,
    });
    expect(unlistedPublic.statusCode).toBe(200);
    const processingOther = await mobileRequest(app, {
      method: 'GET',
      url: `/videos/${processingId}`,
      headers: authHeaders(viewer.token),
    });
    expect(processingOther.statusCode).toBe(404);
  });

  it('paginates the following feed without gaps when a new video is posted', async () => {
    const viewer = await createUser(app, 'followingviewer');
    const author = await createUser(app, 'followingauthor');
    await followDirect(app, viewer.id, author.id);
    const base = Date.now() - 60 * 60 * 1000;
    const originalIds: string[] = [];
    for (let index = 0; index < 15; index += 1) {
      originalIds.push(
        await createVideo(app, {
          ownerId: author.id,
          createdAt: new Date(base + index * 60_000),
        }),
      );
    }

    const first = await getJson<FeedResponse>(app, '/feed/following?limit=5', {
      token: viewer.token,
    });
    expect(first.items).toHaveLength(5);
    await createVideo(app, { ownerId: author.id, createdAt: new Date() });

    const collected = [...feedIds(first)];
    let cursor = first.nextCursor;
    while (cursor) {
      const page = await getJson<FeedResponse>(
        app,
        `/feed/following?limit=5&cursor=${encodeURIComponent(cursor)}`,
        { token: viewer.token },
      );
      collected.push(...feedIds(page));
      cursor = page.nextCursor;
    }

    expect(collected).toHaveLength(15);
    expect(new Set(collected).size).toBe(15);
    expect(new Set(collected)).toEqual(new Set(originalIds));
  });

  it('keeps For You sessions stable, excludes viewed videos and spaces authors', async () => {
    const viewer = await createUser(app, 'foryouviewer');
    const authors = await Promise.all(
      Array.from({ length: 5 }, (_, index) => createUser(app, `foryouauthor${index}`)),
    );
    const base = Date.now() - 2 * 60 * 60 * 1000;
    for (let index = 0; index < 40; index += 1) {
      const author = authors[index % authors.length];
      if (!author) continue;
      await createVideo(app, {
        ownerId: author.id,
        createdAt: new Date(base + index * 60_000),
        hotScore: 100 - index,
        viewsCount: 10,
      });
    }

    const pageOne = await getJson<FeedResponse>(app, '/feed/for-you?limit=10', {
      token: viewer.token,
    });
    expect(pageOne.items).toHaveLength(10);
    const authorsOnPage = pageOne.items.map((item) => item.author.id);
    for (let index = 0; index < authorsOnPage.length; index += 1) {
      expect(authorsOnPage.slice(Math.max(0, index - 4), index)).not.toContain(
        authorsOnPage[index],
      );
    }

    await createVideo(app, {
      ownerId: authors[0]?.id ?? '',
      createdAt: new Date(),
      hotScore: 10_000,
    });
    const cursor = pageOne.nextCursor;
    expect(cursor).not.toBeNull();
    const pageTwo = await getJson<FeedResponse>(
      app,
      `/feed/for-you?limit=10&cursor=${encodeURIComponent(cursor ?? '')}`,
      { token: viewer.token },
    );
    expect(new Set([...feedIds(pageOne), ...feedIds(pageTwo)]).size).toBe(20);

    const viewedId = pageOne.items[0]?.video.id;
    expect(viewedId).toBeTruthy();
    await postJson(app, `/videos/${viewedId ?? ''}/view`, {
      token: viewer.token,
      payload: { watchedMs: 4_000, completed: true },
    });
    const rebuilt = await getJson<FeedResponse>(app, '/feed/for-you?limit=30', {
      token: viewer.token,
    });
    expect(feedIds(rebuilt)).not.toContain(viewedId);

    const anonymous = await getJson<FeedResponse>(app, '/feed/for-you?limit=5', {
      headers: { 'x-anon-id': 'anon-feed-viewer-1' },
    });
    expect(anonymous.items.length).toBeGreaterThan(0);

    const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    const oldIds = [
      await createVideo(app, {
        ownerId: authors[1]?.id ?? '',
        createdAt: oldDate,
        hotScore: 1_000_000,
      }),
      await createVideo(app, {
        ownerId: authors[2]?.id ?? '',
        createdAt: oldDate,
        hotScore: 1_000_000,
      }),
    ];
    const fallbackViewer = await createUser(app, 'fallbackviewer');
    const fallback = await getJson<FeedResponse>(app, '/feed/for-you?limit=30', {
      token: fallbackViewer.token,
    });
    expect(feedIds(fallback)).toEqual(expect.arrayContaining(oldIds));
  });

  it('keeps like, save and follow counters correct under retries and concurrency', async () => {
    const owner = await createUser(app, 'counterowner');
    const first = await createUser(app, 'counterfirst');
    const second = await createUser(app, 'countersecond');
    const videoId = await createVideo(app, { ownerId: owner.id });

    const likeOne = await postJson<{ liked: boolean; likesCount: number }>(
      app,
      `/videos/${videoId}/like`,
      { token: first.token },
    );
    const likeTwo = await postJson<{ liked: boolean; likesCount: number }>(
      app,
      `/videos/${videoId}/like`,
      { token: first.token },
    );
    expect(likeOne.body.likesCount).toBe(1);
    expect(likeTwo.body.likesCount).toBe(1);

    const concurrent = await Promise.all([
      postJson(app, `/videos/${videoId}/like`, { token: first.token }),
      postJson(app, `/videos/${videoId}/like`, { token: second.token }),
    ]);
    expect(concurrent.every((result) => result.status === 200)).toBe(true);
    const [afterConcurrent] = await app.db
      .select({ likesCount: videos.likesCount })
      .from(videos)
      .where(eq(videos.id, videoId));
    expect(afterConcurrent?.likesCount).toBe(2);

    const sameUserConcurrent = await Promise.all(
      Array.from({ length: 5 }, () =>
        postJson(app, `/videos/${videoId}/like`, { token: second.token }),
      ),
    );
    expect(sameUserConcurrent.every((result) => result.status === 200)).toBe(true);
    const [afterSameUser] = await app.db
      .select({ likesCount: videos.likesCount })
      .from(videos)
      .where(eq(videos.id, videoId));
    expect(afterSameUser?.likesCount).toBe(2);

    const unlike = await mobileRequest(app, {
      method: 'DELETE',
      url: `/videos/${videoId}/like`,
      headers: authHeaders(first.token),
    });
    expectStatus(unlike, 200);
    const unlikeAgain = await mobileRequest(app, {
      method: 'DELETE',
      url: `/videos/${videoId}/like`,
      headers: authHeaders(first.token),
    });
    expectStatus(unlikeAgain, 200);
    expect((unlikeAgain.json() as { likesCount: number }).likesCount).toBe(1);

    await postJson(app, `/videos/${videoId}/save`, { token: first.token });
    const saveAgain = await postJson<{ savesCount: number }>(app, `/videos/${videoId}/save`, {
      token: first.token,
    });
    expect(saveAgain.body.savesCount).toBe(1);

    const followOne = await postJson<{ followersCount: number }>(
      app,
      `/users/${owner.username}/follow`,
      { token: first.token },
    );
    const followTwo = await postJson<{ followersCount: number }>(
      app,
      `/users/${owner.username}/follow`,
      { token: first.token },
    );
    expect(followOne.body.followersCount).toBe(1);
    expect(followTwo.body.followersCount).toBe(1);
    const unfollow = await mobileRequest(app, {
      method: 'DELETE',
      url: `/users/${owner.username}/follow`,
      headers: authHeaders(first.token),
    });
    expectStatus(unfollow, 200);
    const unfollowAgain = await mobileRequest(app, {
      method: 'DELETE',
      url: `/users/${owner.username}/follow`,
      headers: authHeaders(first.token),
    });
    expectStatus(unfollowAgain, 200);
    expect((unfollowAgain.json() as { followersCount: number }).followersCount).toBe(0);

    const selfFollow = await postJson(app, `/users/${first.username}/follow`, {
      token: first.token,
    });
    expect(selfFollow.status).toBe(400);
  });

  it('deduplicates views per viewer and enforces the watch threshold', async () => {
    const owner = await createUser(app, 'viewowner');
    const viewer = await createUser(app, 'viewviewer');
    const videoId = await createVideo(app, { ownerId: owner.id });

    const short = await postJson<{ counted: boolean; viewsCount: number }>(
      app,
      `/videos/${videoId}/view`,
      { payload: { watchedMs: 1_000, completed: false }, headers: { 'x-anon-id': 'anon-view-1' } },
    );
    expect(short.body).toEqual({ counted: false, viewsCount: 0 });

    const counted = await postJson<{ counted: boolean; viewsCount: number }>(
      app,
      `/videos/${videoId}/view`,
      { payload: { watchedMs: 2_500, completed: false }, headers: { 'x-anon-id': 'anon-view-1' } },
    );
    expect(counted.body).toEqual({ counted: true, viewsCount: 1 });

    const duplicate = await postJson<{ counted: boolean; viewsCount: number }>(
      app,
      `/videos/${videoId}/view`,
      { payload: { watchedMs: 3_000, completed: true }, headers: { 'x-anon-id': 'anon-view-1' } },
    );
    expect(duplicate.body.counted).toBe(false);

    const loggedIn = await postJson<{ counted: boolean; viewsCount: number }>(
      app,
      `/videos/${videoId}/view`,
      { token: viewer.token, payload: { watchedMs: 0, completed: true } },
    );
    expect(loggedIn.body).toEqual({ counted: true, viewsCount: 2 });
  });

  it('enforces one-level reply depth, soft delete permissions and comment counters', async () => {
    const owner = await createUser(app, 'commentowner');
    const first = await createUser(app, 'commentfirst');
    const second = await createUser(app, 'commentsecond');
    const third = await createUser(app, 'commentthird');
    const stranger = await createUser(app, 'commentstranger');
    const videoId = await createVideo(app, { ownerId: owner.id });

    const top = await postJson<{ comment: { id: string } }>(app, `/videos/${videoId}/comments`, {
      token: first.token,
      payload: { text: ' top ' },
    });
    expect(top.status).toBe(201);
    const topId = top.body.comment.id;
    const reply = await postJson<{ comment: { id: string; parentId: string } }>(
      app,
      `/videos/${videoId}/comments`,
      { token: second.token, payload: { text: 'reply', parentId: topId } },
    );
    const replyId = reply.body.comment.id;
    const nested = await postJson<{
      comment: { parentId: string; replyToUser: { id: string } | null };
    }>(app, `/videos/${videoId}/comments`, {
      token: third.token,
      payload: { text: 'nested', parentId: replyId },
    });
    expect(nested.body.comment.parentId).toBe(topId);
    expect(nested.body.comment.replyToUser?.id).toBe(second.id);

    const [storedNested] = await app.db
      .select({ parentId: comments.parentId, replyToUserId: comments.replyToUserId })
      .from(comments)
      .where(eq(comments.id, (nested.body.comment as { id?: string }).id ?? ''));
    expect(storedNested?.parentId).toBe(topId);
    expect(storedNested?.replyToUserId).toBe(second.id);

    const topLevel = await getJson<CommentListResponse>(app, `/videos/${videoId}/comments`, {
      token: third.token,
    });
    expect(topLevel.items).toHaveLength(1);
    expect(topLevel.items[0]?.replyCount).toBe(2);
    expect(topLevel.items[0]?.text).toBe('top');

    const replies = await getJson<CommentListResponse>(app, `/comments/${topId}/replies`, {
      token: third.token,
    });
    expect(replies.items.map((item) => item.text)).toEqual(['reply', 'nested']);

    const strangerDelete = await mobileRequest(app, {
      method: 'DELETE',
      url: `/comments/${replyId}`,
      headers: authHeaders(stranger.token),
    });
    expect(strangerDelete.statusCode).toBe(403);

    const authorDelete = await mobileRequest(app, {
      method: 'DELETE',
      url: `/comments/${replyId}`,
      headers: authHeaders(second.token),
    });
    expect(authorDelete.statusCode).toBe(200);
    const afterDelete = await getJson<CommentListResponse>(app, `/comments/${topId}/replies`, {
      token: third.token,
    });
    expect(afterDelete.items).toHaveLength(2);
    expect(afterDelete.items[0]?.isRemoved).toBe(true);
    expect(afterDelete.items[0]?.author).toBeNull();

    await postJson(app, `/comments/${topId}/like`, { token: third.token });
    const doubleLike = await postJson<{ likesCount: number }>(app, `/comments/${topId}/like`, {
      token: third.token,
    });
    expect(doubleLike.body.likesCount).toBe(1);
    await mobileRequest(app, {
      method: 'DELETE',
      url: `/comments/${topId}/like`,
      headers: authHeaders(third.token),
    });
    const doubleUnlike = await mobileRequest(app, {
      method: 'DELETE',
      url: `/comments/${topId}/like`,
      headers: authHeaders(third.token),
    });
    expect((doubleUnlike.json() as { likesCount: number }).likesCount).toBe(0);

    const ownerDelete = await mobileRequest(app, {
      method: 'DELETE',
      url: `/comments/${topId}`,
      headers: authHeaders(owner.token),
    });
    expect(ownerDelete.statusCode).toBe(200);
    const thread = await getJson<CommentListResponse>(app, `/videos/${videoId}/comments`, {
      token: third.token,
    });
    expect(thread.items[0]?.isRemoved).toBe(true);
    expect(thread.items[0]?.replyCount).toBe(1);

    const [videoRow] = await app.db
      .select({ commentsCount: videos.commentsCount })
      .from(videos)
      .where(eq(videos.id, videoId));
    expect(videoRow?.commentsCount).toBe(1);

    const admin = await createUser(app, 'commentadmin');
    await app.db.update(users).set({ role: 'admin' }).where(eq(users.id, admin.id));
    const removable = await postJson<{ comment: { id: string } }>(
      app,
      `/videos/${videoId}/comments`,
      { token: first.token, payload: { text: 'admin removes this' } },
    );
    const adminDelete = await mobileRequest(app, {
      method: 'DELETE',
      url: `/comments/${removable.body.comment.id}`,
      headers: authHeaders(admin.token),
    });
    expect(adminDelete.statusCode).toBe(200);
  });

  it('rate limits comment creation to ten per minute', async () => {
    const owner = await createUser(app, 'ratelimitowner');
    const writer = await createUser(app, 'ratelimitwriter');
    const videoId = await createVideo(app, { ownerId: owner.id });
    let lastStatus = 0;
    for (let index = 0; index < 11; index += 1) {
      const result = await postJson(app, `/videos/${videoId}/comments`, {
        token: writer.token,
        payload: { text: `comment ${index}` },
      });
      lastStatus = result.status;
    }
    expect(lastStatus).toBe(429);
  });

  it('recomputes hot scores and repairs counter drift in maintenance jobs', async () => {
    const owner = await createUser(app, 'maintowner');
    const fan = await createUser(app, 'maintfan');
    const videoId = await createVideo(app, {
      ownerId: owner.id,
      likesCount: 99,
      viewsCount: 99,
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
    });
    await app.db.insert(likes).values([
      { userId: owner.id, videoId },
      { userId: fan.id, videoId },
    ]);
    await app.db.insert(saves).values({ userId: fan.id, videoId });
    const [comment] = await app.db
      .insert(comments)
      .values({ videoId, userId: fan.id, body: 'hello' })
      .returning({ id: comments.id });
    await app.db.insert(videoViews).values({
      videoId,
      userId: fan.id,
      watchedMs: 4_000,
      completed: true,
    });
    await app.db.insert(follows).values({ followerId: fan.id, followingId: owner.id });
    await app.db.update(users).set({ followersCount: 99 }).where(eq(users.id, owner.id));
    await app.db.update(users).set({ followingCount: 99 }).where(eq(users.id, fan.id));
    await app.db
      .update(videos)
      .set({ commentsCount: 99, savesCount: 99 })
      .where(eq(videos.id, videoId));

    const hot = await recomputeHotScores(app.db);
    expect(hot.videosUpdated).toBe(1);
    const [scored] = await app.db
      .select({ hotScore: videos.hotScore })
      .from(videos)
      .where(eq(videos.id, videoId));
    expect(scored?.hotScore).toBeGreaterThan(0);

    const repaired = await reconcileCounters(app.db);
    expect(repaired.likedVideos).toBe(1);
    expect(repaired.commentedVideos).toBe(1);
    expect(repaired.savedVideos).toBe(1);
    expect(repaired.followers).toBe(1);
    expect(repaired.following).toBe(1);
    expect(repaired.replyCounts).toBe(0);

    const [fixedVideo] = await app.db
      .select({
        likesCount: videos.likesCount,
        commentsCount: videos.commentsCount,
        savesCount: videos.savesCount,
      })
      .from(videos)
      .where(eq(videos.id, videoId));
    expect(fixedVideo).toEqual({ likesCount: 2, commentsCount: 1, savesCount: 1 });
    const [fixedOwner] = await app.db
      .select({ followersCount: users.followersCount })
      .from(users)
      .where(eq(users.id, owner.id));
    expect(fixedOwner?.followersCount).toBe(1);
    expect(comment?.id).toBeTruthy();
  });

  it('returns AUTH_REQUIRED for logged-out interactions while public reads work', async () => {
    const owner = await createUser(app, 'authowner');
    const videoId = await createVideo(app, { ownerId: owner.id });
    const [comment] = await app.db
      .insert(comments)
      .values({ videoId, userId: owner.id, body: 'auth check' })
      .returning({ id: comments.id });
    const commentId = comment?.id ?? '';

    for (const request of [
      { method: 'POST' as const, url: `/videos/${videoId}/like` },
      { method: 'DELETE' as const, url: `/videos/${videoId}/like` },
      { method: 'POST' as const, url: `/videos/${videoId}/save` },
      { method: 'DELETE' as const, url: `/videos/${videoId}/save` },
      { method: 'POST' as const, url: `/users/${owner.username}/follow` },
      { method: 'DELETE' as const, url: `/users/${owner.username}/follow` },
      { method: 'POST' as const, url: `/videos/${videoId}/comments`, payload: { text: 'x' } },
      { method: 'POST' as const, url: `/videos/${videoId}/share` },
      { method: 'POST' as const, url: `/comments/${commentId}/like` },
      { method: 'DELETE' as const, url: `/comments/${commentId}` },
    ]) {
      const response = await mobileRequest(app, request);
      expect(response.statusCode).toBe(401);
      expect((response.json() as { error: { code: string } }).error.code).toBe('AUTH_REQUIRED');
    }

    const publicFeed = await mobileRequest(app, { method: 'GET', url: '/feed/for-you' });
    expect(publicFeed.statusCode).toBe(200);
    const commentsRead = await mobileRequest(app, {
      method: 'GET',
      url: `/videos/${videoId}/comments`,
    });
    expect(commentsRead.statusCode).toBe(200);
  });

  it('rejects malformed cursors and exposes real profile counts and follow state', async () => {
    const viewer = await createUser(app, 'profileviewer');
    const author = await createUser(app, 'profileauthor');
    await createVideo(app, { ownerId: author.id });
    await postJson(app, `/users/${author.username}/follow`, { token: viewer.token });

    const profile = await getJson<{
      user: { counts: { videos: number; followers: number } };
      viewerState: { following: boolean };
    }>(app, `/users/${author.username}`, { token: viewer.token });
    expect(profile.user.counts.videos).toBe(1);
    expect(profile.user.counts.followers).toBe(1);
    expect(profile.viewerState.following).toBe(true);

    const badFollowing = await mobileRequest(app, {
      method: 'GET',
      url: '/feed/following?cursor=not-a-cursor',
      headers: authHeaders(viewer.token),
    });
    expect(badFollowing.statusCode).toBe(400);
    const badForYou = await mobileRequest(app, {
      method: 'GET',
      url: '/feed/for-you?cursor=not-a-cursor',
      headers: authHeaders(viewer.token),
    });
    expect(badForYou.statusCode).toBe(400);
    const badComments = await mobileRequest(app, {
      method: 'GET',
      url: `/videos/${await createVideo(app, { ownerId: author.id })}/comments?cursor=not-a-cursor`,
    });
    expect(badComments.statusCode).toBe(400);
  });

  it('updates followers and following lists with viewer follow state', async () => {
    const viewer = await createUser(app, 'listviewer');
    const author = await createUser(app, 'listauthor');
    const other = await createUser(app, 'listother');
    await postJson(app, `/users/${author.username}/follow`, { token: viewer.token });
    await postJson(app, `/users/${other.username}/follow`, { token: viewer.token });

    const followers = await getJson<{
      items: Array<{ user: { id: string }; viewerState: { following: boolean } }>;
    }>(app, `/users/${author.username}/followers`, { token: viewer.token });
    expect(followers.items.some((item) => item.user.id === viewer.id)).toBe(true);

    const following = await getJson<{
      items: Array<{ user: { username: string }; viewerState: { following: boolean } }>;
    }>(app, `/users/${viewer.username}/following`, { token: viewer.token });
    expect(following.items.map((item) => item.user.username).sort()).toEqual(
      [author.username, other.username].sort(),
    );
    expect(following.items.every((item) => item.viewerState.following)).toBe(true);

    const followerRows = await app.db
      .select({ id: follows.id })
      .from(follows)
      .where(and(eq(follows.followerId, viewer.id), eq(follows.followingId, author.id)));
    expect(followerRows).toHaveLength(1);
  });
});
