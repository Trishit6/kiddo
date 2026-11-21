import type { MeUser, PublicUser } from '@reel/shared';
import type { users } from '../db/schema.js';

type UserRow = typeof users.$inferSelect;
interface AppConfig {
  config: { S3_PUBLIC_BASE_URL: string };
}

export function avatarUrl(app: AppConfig, key: string | null): string | null {
  if (!key) return null;
  const base = app.config.S3_PUBLIC_BASE_URL.replace(/\/$/, '');
  const encoded = key.split('/').map(encodeURIComponent).join('/');
  return `${base}/${encoded}`;
}

function createdAt(row: UserRow): string {
  return row.createdAt instanceof Date
    ? row.createdAt.toISOString()
    : new Date(row.createdAt).toISOString();
}

function counts(row: UserRow, videosCount: number) {
  return {
    videos: videosCount,
    followers: row.followersCount,
    following: row.followingCount,
  };
}

export function toPublicUser(app: AppConfig, row: UserRow, videosCount = 0): PublicUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    bio: row.bio,
    avatarUrl: avatarUrl(app, row.avatarKey),
    role: row.role,
    createdAt: createdAt(row),
    counts: counts(row, videosCount),
  };
}

export function toMeUser(app: AppConfig, row: UserRow): MeUser {
  return {
    ...toPublicUser(app, row),
    email: row.email,
    emailVerified: row.emailVerifiedAt !== null,
  };
}
