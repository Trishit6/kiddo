import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { buildApp } from '../../app.js';
import { users } from '../../db/schema.js';
import { cleanUsers, expectStatus, mobileRequest } from '../../test/helpers.js';
import { createUser, createVideo } from '../../test/social-helpers.js';

describe('share previews', () => {
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

  async function sharePage(videoId: string) {
    const response = await mobileRequest(app, {
      method: 'GET',
      url: `/s/${videoId}`,
      headers: { accept: 'text/html' },
    });
    return response;
  }

  it('renders escaped Open Graph metadata for a public video', async () => {
    const author = await createUser(app, 'shareauthor');
    const caption = '<script>alert("pwned")</script> & "quotes" #fun';
    const videoId = await createVideo(app, { ownerId: author.id, caption });

    const response = expectStatus(await sharePage(videoId), 200);
    expect(response.headers['content-type']).toContain('text/html');
    const body = response.body;

    expect(body).toContain('<meta property="og:title"');
    expect(body).toContain('&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;');
    expect(body).not.toContain('<script>alert("pwned")');
    expect(body).toContain('&amp; &quot;quotes&quot;');
    expect(body).toContain('<meta property="og:image"');
    expect(body).toContain(`/video/${videoId}`);
    expect(body).toContain('summary_large_image');
  });

  it('serves generic metadata when the video is not publicly visible', async () => {
    const author = await createUser(app, 'privateauthor');
    const banned = await createUser(app, 'bannedsharer');
    await app.db.update(users).set({ status: 'banned' }).where(eq(users.id, banned.id));

    const ids = [
      await createVideo(app, {
        ownerId: author.id,
        caption: 'Secret private caption',
        visibility: 'private',
      }),
      await createVideo(app, {
        ownerId: author.id,
        caption: 'Secret unlisted caption',
        visibility: 'unlisted',
      }),
      await createVideo(app, {
        ownerId: author.id,
        caption: 'Secret processing caption',
        status: 'processing',
      }),
      await createVideo(app, {
        ownerId: author.id,
        caption: 'Secret deleted caption',
        deletedAt: new Date(),
      }),
      await createVideo(app, { ownerId: banned.id, caption: 'Secret banned caption' }),
    ];

    for (const id of ids) {
      const response = expectStatus(await sharePage(id), 200);
      const body = response.body;
      expect(body).toContain('Watch a video on Kiddo');
      expect(body).not.toContain('Secret');
      expect(body).not.toContain('og:image');
      expect(body).toContain(`/video/${id}`);
    }
  });

  it('rejects a malformed video id', async () => {
    const response = await mobileRequest(app, {
      method: 'GET',
      url: '/s/not-a-uuid',
    });
    expectStatus(response, 400);
  });
});
