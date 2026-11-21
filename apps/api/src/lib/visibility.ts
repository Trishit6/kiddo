import { and, eq, inArray, isNull, or, type SQL } from 'drizzle-orm';
import type { UserRole } from '@reel/shared';
import { users, videos } from '../db/schema.js';

export interface Viewer {
  id: string;
  role: UserRole;
}

/**
 * The only condition that may be used by feeds, search, profiles and every
 * other list: ready, not deleted, author active and public.
 */
export function publicFeedVisibility(): SQL {
  return and(
    eq(videos.status, 'ready'),
    isNull(videos.deletedAt),
    eq(users.status, 'active'),
    eq(videos.visibility, 'public'),
  )!;
}

/**
 * Direct links may expose unlisted videos, and owners/admins may inspect their
 * own non-ready videos. Deleted videos are never visible.
 */
export function directVideoVisibility(viewer: Viewer | null): SQL {
  if (viewer?.role === 'admin') return isNull(videos.deletedAt)!;
  if (viewer) {
    return and(
      isNull(videos.deletedAt),
      or(
        eq(videos.ownerId, viewer.id),
        and(
          eq(videos.status, 'ready'),
          eq(users.status, 'active'),
          inArray(videos.visibility, ['public', 'unlisted']),
        ),
      ),
    )!;
  }
  return and(
    isNull(videos.deletedAt),
    eq(videos.status, 'ready'),
    eq(users.status, 'active'),
    inArray(videos.visibility, ['public', 'unlisted']),
  )!;
}
