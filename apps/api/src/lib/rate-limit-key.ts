import { createHash } from 'node:crypto';
import type { FastifyRequest } from 'fastify';

/**
 * Fastify rate limiting runs before authentication, so the authenticated user
 * id is not available yet. Hashing the bearer token gives a stable per-user key
 * without storing raw tokens in Redis. Anonymous requests fall back to their
 * client-generated id and finally to the request IP.
 */
export function interactionRateLimitKey(request: FastifyRequest): string {
  const authorization = request.headers.authorization;
  if (authorization) {
    const token = authorization.replace(/^Bearer\s+/i, '');
    return `user:${createHash('sha256').update(token).digest('hex').slice(0, 32)}`;
  }
  const anonHeader = request.headers['x-anon-id'];
  const anonId = Array.isArray(anonHeader) ? anonHeader[0] : anonHeader;
  if (anonId) return `anon:${anonId}`;
  return `ip:${request.ip}`;
}
