import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { OAuth2Client } from 'google-auth-library';
import {
  authResponseSchema,
  errorResponseSchema,
  forgotPasswordRequestSchema,
  googleSignInRequestSchema,
  loginRequestSchema,
  logoutRequestSchema,
  meResponseSchema,
  messageResponseSchema,
  refreshRequestSchema,
  resetPasswordRequestSchema,
  resendVerificationRequestSchema,
  signupRequestSchema,
  verifyEmailRequestSchema,
} from '@reel/shared';
import { emailTokens, oauthAccounts, refreshTokens, users } from '../../db/schema.js';
import { AppError, badRequest, conflict, forbidden, unauthorized } from '../../lib/errors.js';
import { hashPassword, verifyPassword } from '../../lib/passwords.js';
import {
  generateOpaqueToken,
  hashSecret,
  secretsEqual,
  signAccessToken,
} from '../../lib/tokens.js';
import { toMeUser } from '../../lib/users.js';

const strictRateLimit = { rateLimit: { max: 5, timeWindow: '15 minutes' } };

type UserRow = typeof users.$inferSelect;
type RefreshRow = typeof refreshTokens.$inferSelect;

function isMobile(request: { headers: Record<string, unknown> }): boolean {
  return request.headers['x-client'] === 'mobile';
}

function cookieOptions(app: { config: { JWT_REFRESH_TTL_SECONDS: number; NODE_ENV: string } }) {
  return {
    httpOnly: true,
    secure: app.config.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/auth',
    maxAge: app.config.JWT_REFRESH_TTL_SECONDS,
    signed: true,
  };
}

function linkFor(app: { config: { APP_URL: string } }, path: string, token: string): string {
  const url = new URL(path, app.config.APP_URL);
  url.searchParams.set('token', token);
  return url.toString();
}

function sessionPayload(
  app: FastifyInstance,
  user: UserRow,
  accessToken: string,
  clientRefreshToken: string | null,
) {
  return {
    user: toMeUser(app, user),
    tokens: {
      accessToken,
      refreshToken: clientRefreshToken,
      expiresIn: app.config.JWT_ACCESS_TTL_SECONDS,
      tokenType: 'Bearer' as const,
    },
  };
}

async function accessTokenFor(app: FastifyInstance, user: UserRow): Promise<string> {
  return signAccessToken(
    { sub: user.id, role: user.role, emailVerified: user.emailVerifiedAt !== null },
    {
      secret: app.config.JWT_ACCESS_SECRET,
      issuer: app.config.JWT_ISSUER,
      audience: app.config.JWT_AUDIENCE,
      ttlSeconds: app.config.JWT_ACCESS_TTL_SECONDS,
    },
  );
}

export const authPlugin: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', async (request) => {
    if (request.method === 'GET' || isMobile(request)) return;
    if (!request.cookies?.refreshToken) return;

    const origin = request.headers.origin;
    if (!origin) return;
    let allowed: boolean;
    try {
      allowed = new URL(origin).origin === new URL(app.config.APP_URL).origin;
    } catch {
      allowed = false;
    }
    if (!allowed) throw forbidden('FORBIDDEN', 'Cross-origin request rejected');
  });

  async function createSession(request: FastifyRequest, reply: FastifyReply, user: UserRow) {
    const refreshToken = generateOpaqueToken();
    await app.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: hashSecret(refreshToken),
      expiresAt: new Date(Date.now() + app.config.JWT_REFRESH_TTL_SECONDS * 1000),
      userAgent:
        typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
      ip: request.ip ?? null,
    });
    const accessToken = await accessTokenFor(app, user);
    if (!isMobile(request)) reply.setCookie('refreshToken', refreshToken, cookieOptions(app));
    return sessionPayload(app, user, accessToken, isMobile(request) ? refreshToken : null);
  }

  async function findUserByEmail(email: string): Promise<UserRow | undefined> {
    const [row] = await app.db.select().from(users).where(eq(users.email, email)).limit(1);
    return row;
  }

  async function uniqueUsername(email: string): Promise<string> {
    const local = (email.split('@')[0] ?? 'user').replace(/[^A-Za-z0-9._]/g, '').slice(0, 20);
    const base = local.length >= 3 ? local : `user${local}`;
    for (let index = 0; index < 20; index += 1) {
      const candidate = index === 0 ? base : `${base.slice(0, 19 - String(index).length)}${index}`;
      const [existing] = await app.db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.username}) = ${candidate.toLowerCase()}`)
        .limit(1);
      if (!existing) return candidate;
    }
    return `user${generateOpaqueToken()
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 12)}`;
  }

  async function issueEmailToken(
    userId: string,
    type: 'verify_email' | 'reset_password',
    ttlMinutes: number,
  ): Promise<string> {
    const token = generateOpaqueToken();
    await app.db.insert(emailTokens).values({
      userId,
      type,
      tokenHash: hashSecret(token),
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
    });
    return token;
  }

  async function consumeEmailToken(
    token: string,
    type: 'verify_email' | 'reset_password',
  ): Promise<string> {
    const tokenHash = hashSecret(token);
    const [row] = await app.db
      .select()
      .from(emailTokens)
      .where(
        and(
          eq(emailTokens.type, type),
          eq(emailTokens.tokenHash, tokenHash),
          isNull(emailTokens.consumedAt),
        ),
      )
      .limit(1);
    const expected = row?.tokenHash ?? hashSecret(generateOpaqueToken());
    if (!secretsEqual(expected, tokenHash)) {
      throw badRequest('AUTH_EMAIL_TOKEN_INVALID', 'This link is invalid or has expired');
    }
    if (!row || row.expiresAt.getTime() < Date.now() || row.consumedAt !== null) {
      throw badRequest('AUTH_EMAIL_TOKEN_INVALID', 'This link is invalid or has expired');
    }
    await app.db
      .update(emailTokens)
      .set({ consumedAt: new Date() })
      .where(eq(emailTokens.id, row.id));
    return row.userId;
  }

  async function findRefreshRow(token: string): Promise<RefreshRow> {
    const tokenHash = hashSecret(token);
    const [row] = await app.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);
    const expected = row?.tokenHash ?? hashSecret(generateOpaqueToken());
    if (!secretsEqual(expected, tokenHash) || !row) {
      throw unauthorized('AUTH_INVALID_TOKEN', 'Invalid refresh token');
    }
    return row;
  }

  async function resolveRefreshToken(
    request: {
      headers: Record<string, unknown>;
      cookies: Record<string, string | undefined>;
      unsignCookie: (value: string) => { valid: boolean; value: string | null };
    },
    body: { refreshToken?: string },
  ): Promise<string> {
    if (isMobile(request)) {
      if (!body.refreshToken) {
        throw unauthorized('AUTH_INVALID_TOKEN', 'Refresh token required');
      }
      return body.refreshToken;
    }
    const cookie = request.cookies?.refreshToken;
    if (!cookie) throw unauthorized('AUTH_INVALID_TOKEN', 'Refresh token required');
    const unsigned = request.unsignCookie(cookie);
    if (!unsigned.valid || !unsigned.value) {
      throw unauthorized('AUTH_INVALID_TOKEN', 'Invalid refresh token');
    }
    return unsigned.value;
  }

  async function loadUser(userId: string): Promise<UserRow> {
    const [user] = await app.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw unauthorized('UNAUTHORIZED', 'Authentication required');
    if (user.status !== 'active') {
      throw forbidden('AUTH_USER_DISABLED', 'Account is unavailable');
    }
    return user;
  }

  app.post(
    '/signup',
    {
      config: strictRateLimit,
      schema: {
        description: 'Create an email/password account',
        body: signupRequestSchema,
        response: { 201: authResponseSchema, 400: errorResponseSchema, 409: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const input = request.body;
      const passwordHash = await hashPassword(input.password);
      const [emailExists] = await app.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);
      if (emailExists) throw conflict('AUTH_DUPLICATE_EMAIL', 'Email is already registered');

      const [usernameExists] = await app.db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.username}) = ${input.username.toLowerCase()}`)
        .limit(1);
      if (usernameExists) {
        throw conflict('AUTH_DUPLICATE_USERNAME', 'Username is already taken');
      }

      const [user] = await app.db
        .insert(users)
        .values({
          email: input.email,
          username: input.username,
          displayName: input.displayName ?? input.username,
          bio: input.bio ?? '',
          passwordHash,
        })
        .returning();
      if (!user) throw new AppError(500, 'INTERNAL_ERROR', 'Could not create account');

      const token = await issueEmailToken(user.id, 'verify_email', 24 * 60);
      await app.mail.sendVerificationEmail({
        email: user.email,
        token,
        url: linkFor(app, '/verify-email', token),
      });
      return reply.code(201).send(await createSession(request, reply, user));
    },
  );

  app.post(
    '/login',
    {
      config: strictRateLimit,
      schema: {
        description: 'Log in with email and password',
        body: loginRequestSchema,
        response: {
          200: authResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = await findUserByEmail(request.body.email);
      if (!user) {
        await verifyPassword(
          '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$ZmFrZWhhc2g',
          request.body.password,
        );
        throw unauthorized('AUTH_INVALID_CREDENTIALS', 'Invalid email or password');
      }
      if (user.status !== 'active') {
        throw forbidden('AUTH_USER_DISABLED', 'Account is unavailable');
      }
      if (!(await verifyPassword(user.passwordHash, request.body.password))) {
        throw unauthorized('AUTH_INVALID_CREDENTIALS', 'Invalid email or password');
      }
      return reply.send(await createSession(request, reply, user));
    },
  );

  app.post(
    '/refresh',
    {
      schema: {
        description: 'Rotate a refresh token',
        body: refreshRequestSchema,
        response: {
          200: authResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const rawToken = await resolveRefreshToken(request, request.body ?? {});
      const old = await findRefreshRow(rawToken);
      if (old.revokedAt) {
        await app.db
          .update(refreshTokens)
          .set({ revokedAt: new Date() })
          .where(and(eq(refreshTokens.familyId, old.familyId), isNull(refreshTokens.revokedAt)));
        throw unauthorized('AUTH_REFRESH_REUSE_DETECTED', 'Refresh token reuse detected');
      }
      if (old.expiresAt.getTime() < Date.now()) {
        throw unauthorized('AUTH_INVALID_TOKEN', 'Refresh token expired');
      }
      const user = await loadUser(old.userId);

      const nextToken = generateOpaqueToken();
      const [nextRow] = await app.db
        .insert(refreshTokens)
        .values({
          userId: user.id,
          tokenHash: hashSecret(nextToken),
          familyId: old.familyId,
          expiresAt: new Date(Date.now() + app.config.JWT_REFRESH_TTL_SECONDS * 1000),
          userAgent:
            typeof request.headers['user-agent'] === 'string'
              ? request.headers['user-agent']
              : null,
          ip: request.ip ?? null,
        })
        .returning();
      await app.db
        .update(refreshTokens)
        .set({ revokedAt: new Date(), replacedBy: nextRow?.id ?? null })
        .where(eq(refreshTokens.id, old.id));
      if (!nextRow) throw new AppError(500, 'INTERNAL_ERROR', 'Could not rotate refresh token');

      const accessToken = await accessTokenFor(app, user);
      if (!isMobile(request)) reply.setCookie('refreshToken', nextToken, cookieOptions(app));
      return reply.send(
        sessionPayload(app, user, accessToken, isMobile(request) ? nextToken : null),
      );
    },
  );

  app.post(
    '/logout',
    {
      schema: {
        description: 'Revoke the current refresh token',
        body: logoutRequestSchema,
        response: { 200: messageResponseSchema, 401: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const rawToken = await resolveRefreshToken(request, request.body ?? {});
      const row = await findRefreshRow(rawToken);
      if (!row.revokedAt) {
        await app.db
          .update(refreshTokens)
          .set({ revokedAt: new Date() })
          .where(eq(refreshTokens.id, row.id));
      }
      reply.clearCookie('refreshToken', { path: '/auth' });
      return reply.send({ message: 'Signed out' });
    },
  );

  app.post(
    '/logout-all',
    {
      schema: {
        description: 'Revoke every refresh token for the current user',
        body: logoutRequestSchema,
        response: { 200: messageResponseSchema, 401: errorResponseSchema },
      },
    },
    async (request, reply) => {
      const rawToken = await resolveRefreshToken(request, request.body ?? {});
      const row = await findRefreshRow(rawToken);
      await app.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.userId, row.userId));
      reply.clearCookie('refreshToken', { path: '/auth' });
      return reply.send({ message: 'Signed out everywhere' });
    },
  );

  app.get(
    '/me',
    {
      schema: {
        description: 'Get the current user',
        response: { 200: meResponseSchema, 401: errorResponseSchema },
      },
      preHandler: app.authenticate,
    },
    async (request) => {
      const user = await loadUser(request.user?.id ?? '');
      return { user: toMeUser(app, user) };
    },
  );

  app.post(
    '/verify-email',
    {
      config: strictRateLimit,
      schema: {
        description: 'Verify an email address with a one-time token',
        body: verifyEmailRequestSchema,
        response: { 200: messageResponseSchema, 400: errorResponseSchema },
      },
    },
    async (request) => {
      const userId = await consumeEmailToken(request.body.token, 'verify_email');
      await app.db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
      return { message: 'Email verified' };
    },
  );

  app.post(
    '/resend-verification',
    {
      config: strictRateLimit,
      schema: {
        description: 'Send a new verification email',
        body: resendVerificationRequestSchema,
        response: { 200: messageResponseSchema, 400: errorResponseSchema },
      },
    },
    async (request) => {
      const user = await findUserByEmail(request.body.email);
      if (user && !user.emailVerifiedAt) {
        const token = await issueEmailToken(user.id, 'verify_email', 24 * 60);
        await app.mail.sendVerificationEmail({
          email: user.email,
          token,
          url: linkFor(app, '/verify-email', token),
        });
      }
      return { message: 'If the account needs verification, a new email has been sent' };
    },
  );

  app.post(
    '/forgot-password',
    {
      config: strictRateLimit,
      schema: {
        description: 'Send a password reset email',
        body: forgotPasswordRequestSchema,
        response: { 200: messageResponseSchema, 400: errorResponseSchema },
      },
    },
    async (request) => {
      const user = await findUserByEmail(request.body.email);
      if (user) {
        const token = await issueEmailToken(user.id, 'reset_password', 30);
        await app.mail.sendPasswordResetEmail({
          email: user.email,
          token,
          url: linkFor(app, '/reset-password', token),
        });
      }
      return { message: 'If the account exists, a reset link has been sent' };
    },
  );

  app.post(
    '/reset-password',
    {
      config: strictRateLimit,
      schema: {
        description: 'Set a new password with a one-time token',
        body: resetPasswordRequestSchema,
        response: { 200: messageResponseSchema, 400: errorResponseSchema },
      },
    },
    async (request) => {
      const passwordHash = await hashPassword(request.body.password);
      const userId = await consumeEmailToken(request.body.token, 'reset_password');
      await app.db.update(users).set({ passwordHash }).where(eq(users.id, userId));
      await app.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.userId, userId));
      return { message: 'Password updated' };
    },
  );

  app.post(
    '/google',
    {
      schema: {
        description: 'Authenticate with a Google ID token',
        body: googleSignInRequestSchema,
        response: {
          200: authResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const audience = [app.config.GOOGLE_WEB_CLIENT_ID, app.config.GOOGLE_MOBILE_CLIENT_ID].filter(
        (value): value is string => Boolean(value),
      );
      if (audience.length === 0) {
        throw new AppError(404, 'NOT_FOUND', 'Google sign-in is not configured');
      }

      const googleClientId = audience[0];
      if (!googleClientId) {
        throw new AppError(404, 'NOT_FOUND', 'Google sign-in is not configured');
      }

      let payload;
      try {
        const client = new OAuth2Client({ clientId: googleClientId });
        const ticket = await client.verifyIdToken({
          idToken: request.body.idToken,
          audience,
        });
        payload = ticket.getPayload();
      } catch {
        throw unauthorized('AUTH_GOOGLE_INVALID_TOKEN', 'Google token could not be verified');
      }
      if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        throw unauthorized('AUTH_GOOGLE_INVALID_TOKEN', 'Google token could not be verified');
      }

      const email = payload.email.toLowerCase();
      const [existingAccount] = await app.db
        .select()
        .from(oauthAccounts)
        .where(
          and(
            eq(oauthAccounts.provider, 'google'),
            eq(oauthAccounts.providerAccountId, payload.sub),
          ),
        )
        .limit(1);

      let user: UserRow | undefined;
      if (existingAccount) {
        [user] = await app.db
          .select()
          .from(users)
          .where(eq(users.id, existingAccount.userId))
          .limit(1);
      } else {
        user = await findUserByEmail(email);
        if (!user) {
          const [created] = await app.db
            .insert(users)
            .values({
              email,
              username: await uniqueUsername(email),
              displayName: payload.name?.slice(0, 80) || email.split('@')[0] || 'Reel user',
              bio: '',
              passwordHash: null,
              emailVerifiedAt: new Date(),
            })
            .returning();
          user = created;
        }
        if (!user) {
          throw new AppError(401, 'AUTH_GOOGLE_INVALID_TOKEN', 'Google account is unavailable');
        }
        await app.db.insert(oauthAccounts).values({
          userId: user.id,
          provider: 'google',
          providerAccountId: payload.sub,
          email,
        });
      }
      if (!user)
        throw new AppError(401, 'AUTH_GOOGLE_INVALID_TOKEN', 'Google account is unavailable');
      if (user.status !== 'active') {
        throw forbidden('AUTH_USER_DISABLED', 'Account is unavailable');
      }
      return reply.send(await createSession(request, reply, user));
    },
  );
};
