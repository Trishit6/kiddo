import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { FeedItemResponse } from '@reel/shared';
import { buildApp } from '../../app.js';
import { users } from '../../db/schema.js';
import { cleanUsers, expectStatus, mobileRequest } from '../../test/helpers.js';
import { createUser, createVideo, getJson, postJson } from '../../test/social-helpers.js';

describe('single video feed item', () => {
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

  it('returns counts and viewer state for a public video', async () => {
    const author = await createUser(app, 'itemauthor');
    const viewer = await createUser(app, 'itemviewer');
    const videoId = await createVideo(app, { ownerId: author.id, caption: 'Hello item' });
    const liked = await postJson(app, `/videos/${videoId}/like`, { token: viewer.token });
    expect(liked.status).toBe(200);

    const result = await getJson<FeedItemResponse>(app, `/videos/${videoId}/feed-item`, {
      token: viewer.token,
    });

    expect(result.item.video.id).toBe(videoId);
    expect(result.item.author.username).toBe(author.username);
    expect(result.item.viewerState.liked).toBe(true);
    expect(result.item.counts.likes).toBe(1);
  });

  it('hides private and deleted videos from other viewers', async () => {
    const author = await createUser(app, 'hiddenitemauthor');
    const viewer = await createUser(app, 'hiddenitemviewer');
    const privateId = await createVideo(app, { ownerId: author.id, visibility: 'private' });
    const deletedId = await createVideo(app, { ownerId: author.id, deletedAt: new Date() });

    for (const id of [privateId, deletedId]) {
      const response = await mobileRequest(app, {
        method: 'GET',
        url: `/videos/${id}/feed-item`,
        headers: { authorization: `Bearer ${viewer.token}` },
      });
      expectStatus(response, 404);
    }

    const ownerView = await getJson<FeedItemResponse>(app, `/videos/${privateId}/feed-item`, {
      token: author.token,
    });
    expect(ownerView.item.video.id).toBe(privateId);
  });

  it('hides videos from banned authors', async () => {
    const banned = await createUser(app, 'banneditemauthor');
    await app.db.update(users).set({ status: 'banned' }).where(eq(users.id, banned.id));
    const videoId = await createVideo(app, { ownerId: banned.id });

    const response = await mobileRequest(app, {
      method: 'GET',
      url: `/videos/${videoId}/feed-item`,
    });
    expectStatus(response, 404);
  });
});
