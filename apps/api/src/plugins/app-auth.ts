import fp from 'fastify-plugin';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema.js';
import { AppError, forbidden, unauthorized } from '../lib/errors.js';
import { verifyAccessToken } from '../lib/tokens.js';
import type { UserRole } from '@reel/shared';
import type { AuthenticatedUser, AuthHook } from '../types.js';

function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

export const appAuthPlugin = fp(async (app) => {
  app.decorateRequest('user', null);

  const authenticate: AuthHook = async (request) => {
    const token = bearerToken(request.headers.authorization);
    if (!token) throw unauthorized('AUTH_REQUIRED', 'Authentication required');

    try {
      const claims = await verifyAccessToken(token, {
        secret: app.config.JWT_ACCESS_SECRET,
        issuer: app.config.JWT_ISSUER,
        audience: app.config.JWT_AUDIENCE,
      });
      const [row] = await app.db.select().from(users).where(eq(users.id, claims.sub)).limit(1);
      if (!row) throw unauthorized('AUTH_REQUIRED', 'Authentication required');
      if (row.status !== 'active') throw forbidden('AUTH_USER_DISABLED', 'Account is unavailable');

      const user: AuthenticatedUser = {
        id: row.id,
        role: row.role,
        emailVerified: row.emailVerifiedAt !== null,
      };
      request.user = user;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw unauthorized('UNAUTHORIZED', 'Invalid or expired access token');
    }
  };

  const optionalAuth: AuthHook = async (request, reply) => {
    const token = bearerToken(request.headers.authorization);
    if (!token) {
      request.user = null;
      return;
    }
    try {
      await authenticate(request, reply);
    } catch {
      request.user = null;
    }
  };

  const requireVerified: AuthHook = async (request, reply) => {
    await authenticate(request, reply);
    if (!request.user?.emailVerified) {
      throw forbidden('FORBIDDEN', 'Verify your email before uploading videos');
    }
  };

  app.decorate('authenticate', authenticate);
  app.decorate('optionalAuth', optionalAuth);
  app.decorate('requireVerified', requireVerified);
  app.decorate('requireRole', (role: UserRole): AuthHook => async (request, reply) => {
    await authenticate(request, reply);
    if (request.user?.role !== role) {
      throw forbidden('FORBIDDEN', 'Insufficient permissions');
    }
  });
});
