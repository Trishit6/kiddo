import { and, eq, notInArray, or, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { blocks, users } from '../db/schema.js';

/** User ids the viewer has blocked, plus users who have blocked the viewer. */
export async function blockedUserIds(db: Database, viewerId: string): Promise<string[]> {
  const rows = await db
    .select({ blockerId: blocks.blockerId, blockedId: blocks.blockedId })
    .from(blocks)
    .where(or(eq(blocks.blockerId, viewerId), eq(blocks.blockedId, viewerId)));
  const ids = new Set<string>();
  for (const row of rows) {
    ids.add(row.blockerId === viewerId ? row.blockedId : row.blockerId);
  }
  return [...ids];
}

export async function isBlockedPair(
  db: Database,
  firstId: string,
  secondId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: blocks.id })
    .from(blocks)
    .where(
      or(
        and(eq(blocks.blockerId, firstId), eq(blocks.blockedId, secondId)),
        and(eq(blocks.blockerId, secondId), eq(blocks.blockedId, firstId)),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** SQL predicate that hides blocked users' content from list queries. */
export function excludeBlockedAuthors(blockedIds: string[]): SQL | undefined {
  if (blockedIds.length === 0) return undefined;
  return notInArray(users.id, blockedIds);
}
