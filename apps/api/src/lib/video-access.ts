import { and, eq } from 'drizzle-orm';
import type { App } from '../app.js';
import { users, videos } from '../db/schema.js';
import { directVideoVisibility, type Viewer } from './visibility.js';

export async function findInteractableVideo(
  app: Pick<App, 'db'>,
  videoId: string,
  viewer: Viewer | null,
): Promise<{ id: string; ownerId: string; authorStatus: string } | null> {
  const [row] = await app.db
    .select({
      id: videos.id,
      ownerId: videos.ownerId,
      authorStatus: users.status,
    })
    .from(videos)
    .innerJoin(users, eq(users.id, videos.ownerId))
    .where(and(eq(videos.id, videoId), eq(videos.status, 'ready'), directVideoVisibility(viewer)))
    .limit(1);
  return row ?? null;
}
