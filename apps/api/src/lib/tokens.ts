import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { roleSchema } from '@reel/shared';
import type { UserRole } from '@reel/shared';

export interface AccessTokenClaims {
  sub: string;
  role: UserRole;
  emailVerified: boolean;
}

export function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function secretsEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function signAccessToken(
  claims: AccessTokenClaims,
  config: {
    secret: string;
    issuer: string;
    audience: string;
    ttlSeconds: number;
  },
): Promise<string> {
  return new SignJWT({
    role: claims.role,
    emailVerified: claims.emailVerified,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() + config.ttlSeconds * 1000))
    .sign(new TextEncoder().encode(config.secret));
}

export async function verifyAccessToken(
  token: string,
  config: { secret: string; issuer: string; audience: string },
): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(config.secret), {
    algorithms: ['HS256'],
    issuer: config.issuer,
    audience: config.audience,
  });
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('Access token is missing a subject');
  }
  const parsedRole = roleSchema.safeParse(payload.role);
  if (!parsedRole.success) throw new Error('Access token has an invalid role');
  return {
    sub: payload.sub,
    role: parsedRole.data,
    emailVerified: payload.emailVerified === true,
  };
}
