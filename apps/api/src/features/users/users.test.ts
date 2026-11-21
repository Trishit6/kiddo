import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';
import { cleanUsers, expectStatus, mobileRequest, signupMobile } from '../../test/helpers.js';

function errorCode(response: { json(): unknown }): string {
  const body = response.json() as { error?: { code?: string } };
  return body.error?.code ?? '';
}

function authHeaders(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

describe('user profile routes', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await cleanUsers(app);
  });

  it('updates the current profile and enforces username uniqueness', async () => {
    const created = await signupMobile(app, { email: 'profile@example.com' });
    expectStatus(created.response, 201);

    const updated = await mobileRequest(app, {
      method: 'PATCH',
      url: '/users/me',
      headers: authHeaders(created.body.tokens.accessToken),
      payload: { displayName: 'New Name', username: 'newname', bio: 'Hello there' },
    });
    expectStatus(updated, 200);
    const user = (
      updated.json() as { user: { displayName: string; username: string; bio: string } }
    ).user;
    expect(user).toMatchObject({
      displayName: 'New Name',
      username: 'newname',
      bio: 'Hello there',
    });

    const second = await signupMobile(app, { email: 'other@example.com', username: 'othername' });
    expectStatus(second.response, 201);
    const duplicate = await mobileRequest(app, {
      method: 'PATCH',
      url: '/users/me',
      headers: authHeaders(second.body.tokens.accessToken),
      payload: { username: 'NEWNAME' },
    });
    expectStatus(duplicate, 409);
    expect(errorCode(duplicate)).toBe('AUTH_DUPLICATE_USERNAME');

    const empty = await mobileRequest(app, {
      method: 'PATCH',
      url: '/users/me',
      headers: authHeaders(created.body.tokens.accessToken),
      payload: {},
    });
    expectStatus(empty, 400);
  });

  it('creates a presigned avatar URL and confirms a matching upload', async () => {
    const created = await signupMobile(app, { email: 'avatar@example.com' });
    expectStatus(created.response, 201);
    const userId = created.body.user.id;
    const size = 2048;
    const key = `avatars/${userId}/avatar-image`;

    const presign = vi
      .spyOn(app.s3, 'presignedPutObject')
      .mockResolvedValue(`http://localhost:9000/reel-videos/${key}?signature=test`);
    const stat = vi.spyOn(app.s3, 'statObject').mockResolvedValue({
      size,
      etag: '"test"',
      lastModified: new Date(),
      metaData: { 'content-type': 'image/jpeg' },
    });

    const url = await mobileRequest(app, {
      method: 'POST',
      url: '/users/me/avatar-url',
      headers: authHeaders(created.body.tokens.accessToken),
      payload: { contentType: 'image/jpeg', size },
    });
    expectStatus(url, 200);
    const uploadUrl = url.json() as { key: string; publicUrl: string; expiresIn: number };
    expect(uploadUrl.key.startsWith(`avatars/${userId}/`)).toBe(true);
    expect(uploadUrl.publicUrl).toContain(uploadUrl.key);
    expect(uploadUrl.expiresIn).toBeGreaterThan(0);
    expect(presign).toHaveBeenCalledWith(app.config.S3_BUCKET, uploadUrl.key, expect.any(Number));

    const confirmed = await mobileRequest(app, {
      method: 'POST',
      url: '/users/me/avatar',
      headers: authHeaders(created.body.tokens.accessToken),
      payload: { key: uploadUrl.key, contentType: 'image/jpeg', size },
    });
    expectStatus(confirmed, 200);
    const user = (confirmed.json() as { user: { avatarUrl: string | null } }).user;
    expect(user.avatarUrl).toContain(uploadUrl.key);
    expect(stat).toHaveBeenCalledWith(app.config.S3_BUCKET, uploadUrl.key);
  });

  it('rejects invalid avatar keys and mismatched uploaded files', async () => {
    const created = await signupMobile(app, { email: 'avatar-invalid@example.com' });
    expectStatus(created.response, 201);

    const wrongKey = await mobileRequest(app, {
      method: 'POST',
      url: '/users/me/avatar',
      headers: authHeaders(created.body.tokens.accessToken),
      payload: { key: 'avatars/someone-else/file', contentType: 'image/jpeg', size: 10 },
    });
    expectStatus(wrongKey, 400);
    expect(errorCode(wrongKey)).toBe('AVATAR_INVALID_FILE');

    vi.spyOn(app.s3, 'statObject').mockResolvedValue({
      size: 20,
      etag: '"test"',
      lastModified: new Date(),
      metaData: { 'content-type': 'image/jpeg' },
    });
    const remove = vi.spyOn(app.s3, 'removeObject').mockResolvedValue();
    const mismatch = await mobileRequest(app, {
      method: 'POST',
      url: '/users/me/avatar',
      headers: authHeaders(created.body.tokens.accessToken),
      payload: {
        key: `avatars/${created.body.user.id}/file`,
        contentType: 'image/jpeg',
        size: 10,
      },
    });
    expectStatus(mismatch, 400);
    expect(errorCode(mismatch)).toBe('AVATAR_INVALID_FILE');
    expect(remove).toHaveBeenCalled();
  });
});
