import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { buildApp } from '../../app.js';
import { refreshTokens, users } from '../../db/schema.js';
import {
  authBody,
  cleanUsers,
  expectStatus,
  mobileRequest,
  nextIp,
  signupMobile,
  testMail,
} from '../../test/helpers.js';

function errorCode(response: { json(): unknown }): string {
  const body = response.json() as { error?: { code?: string } };
  return body.error?.code ?? '';
}

describe('auth routes', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanUsers(app);
  });

  it('signs up a user with hashed refresh storage and a 15-minute access token', async () => {
    const { response, body, payload } = await signupMobile(app);
    expectStatus(response, 201);
    expect(body.user.email).toBe(payload.email);
    expect(body.user.username).toBe(payload.username);
    expect(body.tokens.tokenType).toBe('Bearer');
    expect(body.tokens.expiresIn).toBe(15 * 60);
    expect(JSON.stringify(body)).not.toContain(payload.password);

    const claimsPart = body.tokens.accessToken.split('.')[1] ?? '';
    const claims = JSON.parse(Buffer.from(claimsPart, 'base64url').toString('utf8')) as {
      iat: number;
      exp: number;
    };
    expect(claims.exp - claims.iat).toBe(15 * 60);

    const [stored] = await app.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.userId, body.user.id));
    expect(stored?.tokenHash).not.toBe(body.tokens.refreshToken);
    expect(stored?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects duplicate email, duplicate case-insensitive username and common passwords', async () => {
    const first = await signupMobile(app, { email: 'taken@example.com', username: 'TakenName' });
    expectStatus(first.response, 201);

    const duplicateEmail = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'taken@example.com',
        username: 'anothername',
        password: 'Str0ng!Passphrase',
      },
    });
    expectStatus(duplicateEmail, 409);
    expect(errorCode(duplicateEmail)).toBe('AUTH_DUPLICATE_EMAIL');

    const duplicateUsername = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'other@example.com',
        username: 'takenname',
        password: 'Str0ng!Passphrase',
      },
    });
    expectStatus(duplicateUsername, 409);
    expect(errorCode(duplicateUsername)).toBe('AUTH_DUPLICATE_USERNAME');

    const commonPassword = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'common@example.com',
        username: 'commonname',
        password: 'password123',
      },
    });
    expectStatus(commonPassword, 400);
    expect(errorCode(commonPassword)).toBe('AUTH_PASSWORD_TOO_COMMON');
  });

  it('validates usernames', async () => {
    for (const username of ['ab', 'bad name!', 'way-too-long-username-value']) {
      const response = await mobileRequest(app, {
        method: 'POST',
        url: '/auth/signup',
        payload: {
          email: `name-${username}@example.com`,
          username,
          password: 'Str0ng!Passphrase',
        },
      });
      expectStatus(response, 400);
    }
  });

  it('logs in with valid credentials and rejects invalid ones', async () => {
    const created = await signupMobile(app, { email: 'login@example.com' });
    expectStatus(created.response, 201);

    const wrongPassword = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'login@example.com', password: 'WrongPassword1!' },
    });
    expectStatus(wrongPassword, 401);
    expect(errorCode(wrongPassword)).toBe('AUTH_INVALID_CREDENTIALS');

    const unknownEmail = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'missing@example.com', password: 'Str0ng!Passphrase' },
    });
    expectStatus(unknownEmail, 401);
    expect(errorCode(unknownEmail)).toBe('AUTH_INVALID_CREDENTIALS');

    const success = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'login@example.com', password: 'Str0ng!Passphrase' },
    });
    expectStatus(success, 200);
    expect(authBody(success).user.id).toBe(created.body.user.id);
  });

  it('rotates refresh tokens and revokes the family on reuse', async () => {
    const created = await signupMobile(app);
    const first = created.body.tokens.refreshToken ?? '';
    expect(first).not.toHaveLength(0);

    const rotated = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: first },
    });
    expectStatus(rotated, 200);
    const second = authBody(rotated).tokens.refreshToken ?? '';
    expect(second).not.toBe(first);

    const reuse = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: first },
    });
    expectStatus(reuse, 401);
    expect(errorCode(reuse)).toBe('AUTH_REFRESH_REUSE_DETECTED');

    const revokedFamily = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: second },
    });
    expectStatus(revokedFamily, 401);
  });

  it('logs out one session and all sessions', async () => {
    const created = await signupMobile(app, { email: 'logout@example.com' });
    const first = created.body.tokens.refreshToken ?? '';

    const single = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/logout',
      payload: { refreshToken: first },
    });
    expectStatus(single, 200);
    const afterLogout = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: first },
    });
    expectStatus(afterLogout, 401);

    const secondLogin = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'logout@example.com', password: 'Str0ng!Passphrase' },
    });
    expectStatus(secondLogin, 200);
    const second = authBody(secondLogin).tokens.refreshToken ?? '';

    const all = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/logout-all',
      payload: { refreshToken: first },
    });
    expectStatus(all, 200);
    const afterAll = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: second },
    });
    expectStatus(afterAll, 401);
  });

  it('blocks banned users from login, refresh and authenticated routes', async () => {
    const created = await signupMobile(app, { email: 'banned@example.com' });
    const refreshToken = created.body.tokens.refreshToken ?? '';
    await app.db.update(users).set({ status: 'banned' }).where(eq(users.id, created.body.user.id));

    const login = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'banned@example.com', password: 'Str0ng!Passphrase' },
    });
    expectStatus(login, 403);
    expect(errorCode(login)).toBe('AUTH_USER_DISABLED');

    const refresh = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });
    expectStatus(refresh, 403);

    const me = await mobileRequest(app, {
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${created.body.tokens.accessToken}` },
    });
    expectStatus(me, 403);
  });

  it('guards authenticated routes and exposes public profiles', async () => {
    const me = await app.inject({ method: 'GET', url: '/auth/me' });
    expectStatus(me, 401);
    const profile = await app.inject({
      method: 'PATCH',
      url: '/users/me',
      payload: { displayName: 'No Auth' },
    });
    expectStatus(profile, 401);

    const created = await signupMobile(app, { username: 'publicone' });
    expectStatus(created.response, 201);
    const publicProfile = await app.inject({ method: 'GET', url: '/users/publicone' });
    expectStatus(publicProfile, 200);
  });

  it('verifies emails with a one-time token and resends verification', async () => {
    const created = await signupMobile(app, { email: 'verify@example.com' });
    expectStatus(created.response, 201);
    const mail = testMail(app);
    const token = mail.messages.at(-1)?.token ?? '';
    expect(token).not.toHaveLength(0);

    const verified = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/verify-email',
      payload: { token },
    });
    expectStatus(verified, 200);

    const reused = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/verify-email',
      payload: { token },
    });
    expectStatus(reused, 400);

    const me = await mobileRequest(app, {
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${created.body.tokens.accessToken}` },
    });
    expectStatus(me, 200);
    expect((me.json() as { user: { emailVerified: boolean } }).user.emailVerified).toBe(true);

    const unverified = await signupMobile(app, { email: 'resend@example.com' });
    expectStatus(unverified.response, 201);
    mail.messages.length = 0;
    const resent = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/resend-verification',
      payload: { email: 'resend@example.com' },
    });
    expectStatus(resent, 200);
    expect(mail.messages).toHaveLength(1);
  });

  it('resets passwords and revokes all existing sessions', async () => {
    const created = await signupMobile(app, { email: 'reset@example.com' });
    const refreshToken = created.body.tokens.refreshToken ?? '';
    expectStatus(created.response, 201);

    const forgot = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/forgot-password',
      payload: { email: 'reset@example.com' },
    });
    expectStatus(forgot, 200);
    const token = testMail(app).messages.at(-1)?.token ?? '';
    expect(token).not.toHaveLength(0);

    const reset = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/reset-password',
      payload: { token, password: 'N3w!SecurePass' },
    });
    expectStatus(reset, 200);

    const oldSession = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });
    expectStatus(oldSession, 401);

    const reusedToken = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/reset-password',
      payload: { token, password: 'An0ther!Pass' },
    });
    expectStatus(reusedToken, 400);

    const newLogin = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'reset@example.com', password: 'N3w!SecurePass' },
    });
    expectStatus(newLogin, 200);
    const oldLogin = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'reset@example.com', password: 'Str0ng!Passphrase' },
    });
    expectStatus(oldLogin, 401);
  });

  it('rate limits repeated login attempts', async () => {
    const remoteAddress = '10.99.9.9';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await mobileRequest(
        app,
        {
          method: 'POST',
          url: '/auth/login',
          payload: { email: 'nobody@example.com', password: 'WrongPassword1!' },
        },
        remoteAddress,
      );
      expectStatus(response, 401);
    }
    const limited = await mobileRequest(
      app,
      {
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'nobody@example.com', password: 'WrongPassword1!' },
      },
      remoteAddress,
    );
    expectStatus(limited, 429);
    expect(errorCode(limited)).toBe('RATE_LIMITED');
  });

  it('uses an httpOnly cookie on web and rejects cross-origin cookie writes', async () => {
    const signup = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { email: 'web@example.com', username: 'webuser', password: 'Str0ng!Passphrase' },
      remoteAddress: nextIp(),
    });
    expectStatus(signup, 201);
    const cookieHeader = signup.headers['set-cookie'];
    const cookie = Array.isArray(cookieHeader)
      ? cookieHeader.find((value) => value.startsWith('refreshToken='))
      : cookieHeader?.startsWith('refreshToken=')
        ? cookieHeader
        : undefined;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/auth/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const csrf = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { cookie: cookie?.split(';')[0] ?? '', origin: 'https://evil.example' },
      payload: {},
    });
    expectStatus(csrf, 403);
    expect(errorCode(csrf)).toBe('FORBIDDEN');
  });

  it('returns 404 for Google sign-in when no client ID is configured', async () => {
    const response = await mobileRequest(app, {
      method: 'POST',
      url: '/auth/google',
      payload: { idToken: 'not-a-token' },
    });
    expectStatus(response, 404);
  });
});
